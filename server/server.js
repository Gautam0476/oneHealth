require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
const { authenticateUser, createToken, ensureConfiguredUsers, readAuthUser } = require('./auth');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const apiHits = new Map();
const rateLimit = (req, res, next) => {
  const windowMs = 15 * 60 * 1000;
  const configuredMax = Number(process.env.RATE_LIMIT_MAX || 300);
  const maxHits = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 300;
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const bucket = apiHits.get(key) ?? { count: 0, resetAt: now + windowMs };

  if (apiHits.size > 1000) {
    for (const [bucketKey, value] of apiHits) {
      if (value.resetAt <= now) apiHits.delete(bucketKey);
    }
  }

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  apiHits.set(key, bucket);

  if (bucket.count > maxHits) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  next();
};

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: allowedOrigins.length
    ? (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin))
    : true,
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit);

app.get('/api/health', (req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 }));
app.post('/api/auth/login', async (req, res) => {
  const user = await authenticateUser(String(req.body.username || '').trim(), String(req.body.password || ''), req);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  return res.json({ user, token: createToken(user) });
});
app.get('/api/auth/me', (req, res) => {
  const user = readAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Login required' });
  return res.json({ user });
});
app.get('/api/ml/model', async (req, res) => {
  const engine = await import('../shared/anomalyEngine.mjs');
  res.json(engine.ML_MODEL);
});
app.use('/api/context', require('./routes/context'));

// If MongoDB is not connected, answer fast so the dashboard can fall back to demo data
app.use('/api', (req, res, next) => req.path.startsWith('/auth/')
  ? next()
  : mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: 'Database not connected' }));

app.use('/api/reports', require('./routes/reports'));
app.use('/api', require('./routes/alerts'));

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist)); // serves the React dashboard after npm run build
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

if (process.env.MONGO_URI) {
  Promise.resolve().then(() => mongoose.connect(process.env.MONGO_URI))
    .then(async () => {
      console.log('MongoDB connected');
      await ensureConfiguredUsers();
      console.log('Auth users ready');
    })
    .catch(err => console.error('MongoDB not connected (dashboard will show demo data):', err.message));
} else {
  console.warn('MONGO_URI is not set. Dashboard will use demo data until a database is configured.');
}
