const express = require('express');
const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const cors = require('cors');
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const kafka = new Kafka({
  clientId: 'ingestion-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:29092']
});

const producer = kafka.producer();

app.post('/events', async (req, res) => {
  try {
    const { service_name, event_type, payload } = req.body;
    const event_id = uuidv4();
    const timestamp = new Date().toISOString();
    const correlation_id = req.header('x-correlation-id') || uuidv4();

    const event = {
      event_id,
      timestamp,
      service_name,
      event_type,
      payload,
      correlation_id,
      version: 1
    };

    await producer.send({
      topic: 'system-events',
      messages: [{ value: JSON.stringify(event) }],
    });

    res.status(202).json({ message: 'Event accepted', event_id, correlation_id });
  } catch (err) {
    console.error('Failed to ingest event', err);
    res.status(503).json({ error: 'Ingestion Service not ready (Kafka connection pending)' });
  }
});

async function start() {
  const port = process.env.PORT || 4001;
  app.listen(port, () => {
    console.log(`Ingestion service listening on port ${port}`);
  });

  const connectWithRetry = async () => {
    try {
      await producer.connect();
      console.log('Ingestion Service connected to Kafka');
    } catch (err) {
      console.error('Failed to connect to Kafka, retrying in 5 seconds...', err.message);
      setTimeout(connectWithRetry, 5000);
    }
  };

  await connectWithRetry();
}

start();
