const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('./models/User');
const AuditLog = require('./models/AuditLog');

const ROLE_PERMISSIONS = {
  viewer: ['reports:read', 'alerts:read'],
  analyst: ['reports:read', 'alerts:read', 'reports:write', 'alerts:validate'],
  admin: ['reports:read', 'alerts:read', 'reports:write', 'alerts:validate', 'users:manage'],
};

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const revokedTokens = new Set();
const getSecret = () => process.env.AUTH_SECRET || process.env.ADMIN_TOKEN || 'one-health-demo-secret';

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const base64url = (value) => Buffer.from(value).toString('base64url');
const sign = (value) => crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');

const defaultUsers = () => [
  { username: 'admin', password: process.env.ADMIN_PASSWORD || process.env.ADMIN_TOKEN || 'admin123', role: 'admin' },
  { username: 'analyst', password: process.env.ANALYST_PASSWORD || 'analyst123', role: 'analyst' },
  { username: 'viewer', password: process.env.VIEWER_PASSWORD || 'viewer123', role: 'viewer' },
];

function parseUsers() {
  if (!process.env.AUTH_USERS) return defaultUsers();

  try {
    const parsed = JSON.parse(process.env.AUTH_USERS);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return process.env.AUTH_USERS.split(';')
      .map((entry) => {
        const [username, password, role = 'viewer'] = entry.split(':').map((part) => part.trim());
        return username && password ? { username, password, role } : null;
      })
      .filter(Boolean);
  }

  return defaultUsers();
}

const publicUser = (user) => ({
  username: user.username,
  role: user.role,
  permissions: ROLE_PERMISSIONS[user.role] || [],
});

async function writeAudit(action, actor, details = {}, req) {
  if (mongoose.connection.readyState !== 1) return;
  try {
    await AuditLog.create({
      action,
      actor: actor?.username || 'anonymous',
      role: actor?.role || 'unknown',
      details,
      ip: req?.ip,
      userAgent: req?.get?.('user-agent'),
    });
  } catch (err) {
    console.warn('Audit log write failed:', err.message);
  }
}

async function authenticateUser(username, password, req) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const rawPassword = String(password || '');

  if (mongoose.connection.readyState === 1) {
    const dbUser = await User.findOne({ username: normalizedUsername, active: true });
    if (dbUser?.verifyPassword(rawPassword) && ROLE_PERMISSIONS[dbUser.role]) {
      dbUser.lastLoginAt = new Date();
      await dbUser.save();
      const user = publicUser(dbUser);
      await writeAudit('auth.login.success', user, {}, req);
      return user;
    }
    await writeAudit('auth.login.failed', { username: normalizedUsername, role: 'unknown' }, {}, req);
    return null;
  }

  const user = parseUsers().find((candidate) => candidate.username === normalizedUsername || candidate.username === username);
  if (!user || !ROLE_PERMISSIONS[user.role] || !safeEqual(user.password, rawPassword)) return null;
  return publicUser(user);
}

async function ensureConfiguredUsers() {
  if (mongoose.connection.readyState !== 1 || process.env.BOOTSTRAP_AUTH_USERS === 'false') return;
  await Promise.all(parseUsers().map((user) => User.upsertWithPassword(user)));
}

function createToken(user) {
  const payload = base64url(JSON.stringify({ ...publicUser(user), exp: Date.now() + TOKEN_TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  if (revokedTokens.has(token)) return null;
  const [payload, signature] = token.split('.');
  if (!signature || !safeEqual(sign(payload), signature)) return null;

  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!user.exp || user.exp < Date.now() || !ROLE_PERMISSIONS[user.role]) return null;
    return publicUser(user);
  } catch {
    return null;
  }
}

function revokeToken(token) {
  if (token) revokedTokens.add(token);
}

function readAuthUser(req) {
  const bearer = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const user = verifyToken(bearer);
  if (user) return user;

  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken && req.get('x-admin-token') === adminToken) {
    return publicUser({ username: 'legacy-admin', role: 'admin' });
  }

  return null;
}

function requirePermission(permission) {
  return (req, res, next) => {
    const user = readAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Login required' });
    if (!user.permissions.includes(permission)) return res.status(403).json({ error: 'Insufficient role permissions' });
    req.user = user;
    return next();
  };
}

module.exports = {
  ROLE_PERMISSIONS,
  authenticateUser,
  createToken,
  revokeToken,
  ensureConfiguredUsers,
  readAuthUser,
  requirePermission,
  writeAudit,
};
