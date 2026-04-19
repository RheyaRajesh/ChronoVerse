const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Kafka } = require('kafkajs');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const kafka = new Kafka({
  clientId: 'visualization-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:29092']
});

const consumer = kafka.consumer({ groupId: 'visualization-group' });

io.on('connection', (socket) => {
  console.log('Client connected to visualization socket', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

async function start() {
  const port = process.env.PORT || 4003;
  httpServer.listen(port, () => {
    console.log(`Visualization service listening on port ${port}`);
  });

  const connectKafka = async () => {
    try {
      await consumer.connect();
      await consumer.subscribe({ topic: 'system-events', fromBeginning: false });
      console.log('Visualization Service connected to Kafka');

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const event = JSON.parse(message.value.toString());
            io.emit('new_event', event);
          } catch (err) {
            console.error('Failed to parse event', err);
          }
        },
      });
    } catch (err) {
      console.error('Kafka Subscription Issue (Topics might be pending), retrying...', err.message);
      setTimeout(connectKafka, 5000);
    }
  };

  await connectKafka();
}

start();
