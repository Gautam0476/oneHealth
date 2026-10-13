require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');
const { ROLE_PERMISSIONS, authenticateUser, createToken, ensureConfiguredUsers, readAuthUser, revokeToken, requirePermission } = require('./auth');

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
let databaseReady = Promise.resolve(false);

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

app.get('/api/health', (req, res) => res.json({
  ok: true,
  database: mongoose.connection.readyState === 1,
  databaseConfigured: Boolean(mongoUri),
  databaseState: mongoose.connection.readyState,
}));
app.post('/api/auth/login', async (req, res) => {
  const hasConfiguredFallbackUsers = Boolean(
    process.env.AUTH_USERS
      || process.env.ADMIN_PASSWORD
      || process.env.ANALYST_PASSWORD
      || process.env.VIEWER_PASSWORD
      || process.env.ADMIN_TOKEN,
  );
  if (mongoose.connection.readyState !== 1 && !hasConfiguredFallbackUsers) {
    return res.status(503).json({ error: 'Authentication service unavailable. Configure MongoDB or explicit auth users.' });
  }
  const user = await authenticateUser(String(req.body.username || '').trim(), String(req.body.password || ''), req);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  return res.json({ user, token: createToken(user) });
});
app.post('/api/auth/signup', async (req, res) => {
  try {
    await databaseReady;
  } catch {
    // The connection attempt is logged at startup; keep credentials and URI details out of the response.
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Signup is unavailable until the authentication database is connected.' });
  }

  const username = String(req.body.username || req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const validUsername = /^[a-z0-9][a-z0-9._-]{2,39}$/.test(username);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(username) && username.length <= 254;
  if (!validUsername && !validEmail) {
    return res.status(400).json({ error: 'Enter a valid username or email address.' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (await User.exists({ username })) return res.status(409).json({ error: 'That username is already registered.' });

  try {
    const user = new User({ username, role: 'viewer', active: true });
    user.setPassword(password);
    await user.save();
    return res.status(201).json({ user: { username, role: 'viewer', permissions: ROLE_PERMISSIONS.viewer } });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'That username is already registered.' });
    console.error('Signup database operation failed:', error.message);
    return res.status(400).json({ error: 'Could not create this account.' });
  }
});
app.post('/api/auth/logout', (req, res) => {
  const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  revokeToken(token);
  return res.status(204).end();
});
app.get('/api/auth/me', (req, res) => {
  const user = readAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Login required' });
  return res.json({ user });
});
app.get('/api/ml/model', requirePermission('reports:read'), async (req, res) => {
  const engine = await import('../shared/anomalyEngine.mjs');
  res.json(engine.ML_MODEL);
});
app.use('/api/context', requirePermission('reports:read'), require('./routes/context'));

// If MongoDB is not connected, answer fast so the dashboard can fall back to demo data
app.use('/api', (req, res, next) => req.path.startsWith('/auth/')
  ? next()
  : mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: 'Database not connected' }));

app.use('/api/reports', require('./routes/reports'));
app.use('/api', require('./routes/alerts'));
app.use('/api/admin', require('./routes/admin'));

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist)); // serves the React dashboard after npm run build
app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

const connectDatabase = async () => {
  if (!mongoUri) {
    console.warn('MongoDB is not configured: set MONGO_URI in the server environment. Database-backed signup and persistence are unavailable.');
    return false;
  }

  const timeout = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000);
  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (error) => console.error('MongoDB connection error:', error.message));

  return mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: Number.isFinite(timeout) ? Math.max(1000, Math.min(timeout, 30000)) : 10000,
  })
    .then(async () => {
      await ensureConfiguredUsers();
      console.log('Auth users ready');
      return true;
    })
    .catch((error) => {
      console.error('MongoDB connection failed; database-backed signup and persistence are unavailable:', error.message);
      return false;
    });
};

databaseReady = connectDatabase();
