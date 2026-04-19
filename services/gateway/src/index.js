const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Forward ingestion requests
const ingestionUrl = process.env.INGESTION_URL || 'http://ingestion:4001';

app.post('/api/events', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${ingestionUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': req.headers['x-correlation-id'] || ''
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gateway failed to forward event' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`API Gateway running on port ${port}`);
});
