const router = require('express').Router();
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Report = require('../models/Report');
const { ROLE_PERMISSIONS, requirePermission, writeAudit } = require('../auth');

const ROLES = new Set(Object.keys(ROLE_PERMISSIONS));
const cleanText = (value, max = 80) => String(value ?? '').trim().slice(0, max);
const cleanLimit = (value) => {
  const limit = Math.round(Number(value || 80));
  return Number.isFinite(limit) ? Math.max(1, Math.min(200, limit)) : 80;
};

const publicUser = (user) => ({
  username: user.username,
  role: user.role,
  active: user.active,
  permissions: ROLE_PERMISSIONS[user.role] || [],
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

router.use(requirePermission('users:manage'));

router.get('/users', async (req, res) => {
  const users = await User.find({}).sort({ role: 1, username: 1 }).lean();
  res.json(users.map(publicUser));
});

router.post('/users', async (req, res) => {
  const username = cleanText(req.body.username, 40).toLowerCase();
  const password = String(req.body.password || '');
  const role = cleanText(req.body.role, 20);

  if (!username || username.length < 3) return res.status(400).json({ error: 'username must be at least 3 characters' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });
  if (!ROLES.has(role)) return res.status(400).json({ error: 'role must be viewer, analyst or admin' });
  if (await User.exists({ username })) return res.status(409).json({ error: 'user already exists' });

  const user = new User({ username, role, active: req.body.active !== false });
  user.setPassword(password);
  await user.save();
  await writeAudit('admin.user.created', req.user, { username, role }, req);
  res.status(201).json(publicUser(user));
});

router.patch('/users/:username', async (req, res) => {
  const username = cleanText(req.params.username, 40).toLowerCase();
  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: 'user not found' });

  const nextRole = req.body.role === undefined ? user.role : cleanText(req.body.role, 20);
  if (!ROLES.has(nextRole)) return res.status(400).json({ error: 'role must be viewer, analyst or admin' });

  user.role = nextRole;
  if (req.body.active !== undefined) user.active = Boolean(req.body.active);
  if (req.body.password) {
    if (String(req.body.password).length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });
    user.setPassword(req.body.password);
  }
  await user.save();
  await writeAudit('admin.user.updated', req.user, {
    username,
    role: user.role,
    active: user.active,
    passwordChanged: Boolean(req.body.password),
  }, req);
  res.json(publicUser(user));
});

router.get('/audit', async (req, res) => {
  const filter = {};
  const action = cleanText(req.query.action, 80);
  const actor = cleanText(req.query.actor, 80).toLowerCase();
  if (action) filter.action = action;
  if (actor) filter.actor = actor;

  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(cleanLimit(req.query.limit)).lean();
  res.json(logs.map((log) => ({
    id: log._id,
    action: log.action,
    actor: log.actor,
    role: log.role,
    details: log.details || {},
    ip: log.ip,
    at: log.createdAt,
  })));
});

router.get('/quality', async (req, res) => {
  const reports = await Report.find({}).sort({ date: -1 }).limit(cleanLimit(req.query.limit || 500)).lean();
  const flagCounts = {};
  const bySource = {};
  let totalScore = 0;

  reports.forEach((report) => {
    totalScore += Number(report.dataQualityScore || 0);
    const source = report.sourceType || 'unknown';
    bySource[source] = (bySource[source] || 0) + 1;
    (report.qualityFlags || []).forEach((flag) => {
      flagCounts[flag] = (flagCounts[flag] || 0) + 1;
    });
  });

  res.json({
    totalReports: reports.length,
    averageScore: reports.length ? Math.round(totalScore / reports.length) : 0,
    lowQualityReports: reports.filter((report) => Number(report.dataQualityScore || 0) < 75).length,
    missingProvenance: reports.filter((report) => !report.sourceType || !report.sourceName).length,
    bySource,
    flagCounts,
    samples: reports
      .filter((report) => Number(report.dataQualityScore || 0) < 85 || (report.qualityFlags || []).length)
      .slice(0, 50)
      .map((report) => ({
        id: report._id,
        disease: report.disease,
        sector: report.sector,
        location: report.location,
        date: report.date,
        sourceType: report.sourceType || 'unknown',
        sourceName: report.sourceName || '-',
        dataQualityScore: report.dataQualityScore || 0,
        qualityFlags: report.qualityFlags || [],
      })),
  });
});

module.exports = router;
