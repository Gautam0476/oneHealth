const router = require('express').Router();
const Report = require('../models/Report');

const SECTORS = new Set(['human', 'animal', 'environment']);
const cleanText = (value) => String(value ?? '').trim();
const cleanCases = (value) => {
  const cases = Number(value);
  if (!Number.isFinite(cases) || cases < 1 || cases > 500) return null;
  return Math.round(cases);
};
const cleanLimit = (value) => {
  if (value === undefined || value === null || value === '') return 50;
  const limit = Math.round(Number(value));
  if (!Number.isFinite(limit)) return null;
  return Math.max(1, Math.min(500, limit));
};
const cleanCoord = (value, min, max) => {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};
const cleanDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const requireWriteToken = (req, res, next) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return next();
  if (req.get('x-admin-token') === token) return next();
  return res.status(401).json({ error: 'Valid x-admin-token header is required' });
};

// GET /api/reports?sector=human&location=Jaipur&limit=50
router.get('/', async (req, res) => {
  try {
    const sector = cleanText(req.query.sector);
    const location = cleanText(req.query.location);
    const filter = {};

    if (sector) {
      if (!SECTORS.has(sector)) return res.status(400).json({ error: 'sector must be human, animal or environment' });
      filter.sector = sector;
    }
    if (location) filter.location = location;

    const limit = cleanLimit(req.query.limit);
    if (!limit) return res.status(400).json({ error: 'limit must be a number from 1 to 500' });

    res.json(await Report.find(filter).sort({ date: -1 }).limit(limit));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/reports  { disease, sector, location, cases, date? }
router.post('/', requireWriteToken, async (req, res) => {
  try {
    const disease = cleanText(req.body.disease);
    const sector = cleanText(req.body.sector);
    const location = cleanText(req.body.location);
    if (!disease || !location || !SECTORS.has(sector)) {
      return res.status(400).json({ error: 'disease, sector and location are required' });
    }

    const cases = cleanCases(req.body.cases);
    const latitude = cleanCoord(req.body.latitude, -90, 90);
    const longitude = cleanCoord(req.body.longitude, -180, 180);
    const date = cleanDate(req.body.date);

    if (!cases) return res.status(400).json({ error: 'cases must be a number from 1 to 500' });
    if (latitude === null) return res.status(400).json({ error: 'latitude must be between -90 and 90' });
    if (longitude === null) return res.status(400).json({ error: 'longitude must be between -180 and 180' });
    if (date === null) return res.status(400).json({ error: 'date must be a valid date' });

    res.status(201).json(await Report.create({
      disease,
      sector,
      location,
      cases,
      latitude,
      longitude,
      date,
    }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
