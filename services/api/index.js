const express = require('express');
const cors = require('cors');
const http = require('node:http');
const { Server } = require('socket.io');
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
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL && (DATABASE_URL.includes('supabase') || DATABASE_URL.includes('render')) ? { rejectUnauthorized: false } : false
});

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

    await pool.query(
      `INSERT INTO events (event_id, timestamp, service_name, event_type, payload, correlation_id, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [event.event_id, event.timestamp, event.service_name, event.event_type, event.payload, event.correlation_id, event.version]
    );

    // Broadcast in real-time
    io.emit('new_event', event);

    res.status(202).json({ message: 'Event accepted', event_id, correlation_id });
  } catch (err) {
    console.error('Failed to ingest event', err);
    res.status(500).json({ error: 'Storage failed' });
  }
});

// --- UNIFIED ENGINE LOGIC (Ported from Python) ---

app.get('/replay/:target_timestamp', async (req, res) => {
  const { target_timestamp } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM events WHERE timestamp <= $1 ORDER BY timestamp ASC", 
      [target_timestamp]
    );
    
    const raw_events = result.rows.map(row => ({
      ...row,
      timestamp: row.timestamp.toISOString()
    }));

    res.json({ status: 'success', raw_events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/fork', (req, res) => {
  const { target_timestamp } = req.query;
  res.json({ status: 'success', message: `Timeline forked at ${target_timestamp}.` });
});

// --- STARTUP ---

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`ChronoVerse Unified Backend (Vercel+Render Optimized) running on port ${PORT}`);
});
