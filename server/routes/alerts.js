const router = require('express').Router();
const Report = require('../models/Report');
const detect = require('../detect');

const DAY = 24 * 60 * 60 * 1000;
const last30Days = () => Report.find({ date: { $gte: new Date(Date.now() - 30 * DAY) } }).lean();

// GET /api/alerts
router.get('/alerts', async (req, res) => res.json(await detect(await last30Days())));

// GET /api/dashboard/stats
router.get('/dashboard/stats', async (req, res) => {
  const reports = await last30Days();
  const week = { human: 0, animal: 0, environment: 0 };
  const prevWeek = { ...week };
  for (const r of reports) {
    const day = Math.floor((Date.now() - r.date) / DAY);
    if (day < 7) week[r.sector] += r.cases;
    else if (day < 14) prevWeek[r.sector] += r.cases;
  }
  res.json({ week, prevWeek, activeAlerts: (await detect(reports)).length });
});

module.exports = router;
