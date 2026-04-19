const { Kafka } = require('kafkajs');
const { Pool } = require('pg');

const kafka = new Kafka({
  clientId: 'event-store-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:29092']
});

const consumer = kafka.consumer({ groupId: 'event-store-group' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function start() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'system-events', fromBeginning: true });
    console.log('Event Store Service connected to Kafka and Subscribed.');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await pool.query(
            `INSERT INTO events (event_id, timestamp, service_name, event_type, payload, correlation_id, version)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (event_id) DO NOTHING`,
            [
              event.event_id,
              event.timestamp,
              event.service_name,
              event.event_type,
              event.payload,
              event.correlation_id,
              event.version
            ]
          );
          console.log(`Stored event ${event.event_id}`);
        } catch (err) {
          console.error('Failed to store event', err);
        }
      },
    });
  } catch (err) {
    console.error('Event Store failed to connect to Kafka, retrying in 5 seconds...', err.message);
    setTimeout(start, 5000);
  }
}

start();
