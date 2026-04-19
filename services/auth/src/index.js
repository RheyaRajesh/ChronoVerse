const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretchronoverse';

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Mock authentication for ChronoVerse demo
  if (username && password) {
    const token = jwt.sign({ username, role: 'Admin' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

const port = process.env.PORT || 4002;
app.listen(port, () => {
    console.log(`Auth Service running on port ${port}`);
});
