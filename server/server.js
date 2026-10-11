require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 }));

// If MongoDB is not connected, answer fast so the dashboard can fall back to demo data
app.use('/api', (req, res, next) =>
  mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: 'Database not connected' }));

app.use('/api/reports', require('./routes/reports'));
app.use('/api', require('./routes/alerts'));

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist)); // serves the React dashboard after npm run build
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

Promise.resolve().then(() => mongoose.connect(process.env.MONGO_URI))
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB not connected (dashboard will show demo data):', err.message));
