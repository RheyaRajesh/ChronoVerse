const { Kafka } = require('kafkajs');
const { Pool } = require('pg');

const kafka = new Kafka({
  clientId: 'projection-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:29092']
});

const consumer = kafka.consumer({ groupId: 'projection-group' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function start() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'system-events', fromBeginning: true });
    console.log('Projection Service started and subscribed to Kafka.');

    // Ensure row exists
    pool.query(`INSERT INTO projections_timeline (id, total_events, anomalies_detected) 
                VALUES ('00000000-0000-0000-0000-000000000001', 0, 0)
                ON CONFLICT (id) DO NOTHING`).catch(console.error);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await pool.query(
            `UPDATE projections_timeline SET total_events = total_events + 1, last_event_timestamp = $1 
             WHERE id = '00000000-0000-0000-0000-000000000001'`,
            [event.timestamp]
          );
        } catch (err) {
          console.error('Failed to update projection', err);
        }
      },
    });
  } catch (err) {
    console.error('Projection Service failed to connect to Kafka, retrying in 5 seconds...', err.message);
    setTimeout(start, 5000);
  }
}

start();
