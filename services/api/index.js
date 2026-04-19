const express = require('express');
const cors = require('cors');
const http = require('node:http');
const { Server } = require('socket.io');
const { Kafka } = require('kafkajs');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretchronoverse';
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:29092';
const DATABASE_URL = process.env.DATABASE_URL;

// Kafka Clients
const kafka = new Kafka({
  clientId: 'chronoverse-api',
  brokers: [KAFKA_BROKER]
});

const producer = kafka.producer();
const pool = new Pool({ connectionString: DATABASE_URL });

// --- API ROUTES ---

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    const token = jwt.sign({ username, role: 'Admin' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/events', async (req, res) => {
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

// --- KAFKA CONSUMER LOGISTICS ---

const startConsumers = async () => {
  // Consumer 1: Event Store (Persistence)
  const storeConsumer = kafka.consumer({ groupId: 'api-event-store-group' });
  await storeConsumer.connect();
  await storeConsumer.subscribe({ topic: 'system-events', fromBeginning: true });

  // Consumer 2: Projection (State Tracking)
  const projectionConsumer = kafka.consumer({ groupId: 'api-projection-group' });
  await projectionConsumer.connect();
  await projectionConsumer.subscribe({ topic: 'system-events', fromBeginning: true });

  // Consumer 3: Visualization (Live Stream)
  const vizConsumer = kafka.consumer({ groupId: 'api-visualization-group' });
  await vizConsumer.connect();
  await vizConsumer.subscribe({ topic: 'system-events', fromBeginning: false });

  // Run Store Consumer
  storeConsumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        await pool.query(
          `INSERT INTO events (event_id, timestamp, service_name, event_type, payload, correlation_id, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (event_id) DO NOTHING`,
          [event.event_id, event.timestamp, event.service_name, event.event_type, event.payload, event.correlation_id, event.version]
        );
      } catch (e) { console.error('Store error', e); }
    }
  });

  // Run Projection Consumer
  projectionConsumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        await pool.query(
          `UPDATE projections_timeline SET total_events = total_events + 1, last_event_timestamp = $1 
           WHERE id = '00000000-0000-0000-0000-000000000001'`,
          [event.timestamp]
        );
      } catch (e) { console.error('Projection error', e); }
    }
  });

  // Run Visualization Consumer (Socket.io bridge)
  vizConsumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        io.emit('new_event', event);
      } catch (e) { console.error('Viz error', e); }
    }
  });

  console.log('All Background Consumers for Core API Started.');
};

// --- STARTUP ---

const PORT = process.env.PORT || 4000;

const connectWithRetry = async () => {
  let connected = false;
  while (!connected) {
    try {
      console.log('Attempting to connect to Kafka...');
      await producer.connect();
      console.log('Producer linked to Kafka');
      await startConsumers();
      connected = true;
    } catch (err) {
      console.error('Kafka connection failed, retrying in 5s...', err.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

httpServer.listen(PORT, async () => {
  console.log(`Core API/Gateway running on port ${PORT}`);
  connectWithRetry();
});
