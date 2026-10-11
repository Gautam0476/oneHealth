const router = require('express').Router();
const Report = require('../models/Report');

const SECTORS = new Set(['human', 'animal', 'environment']);
const cleanText = (value) => String(value ?? '').trim();
const cleanCases = (value) => Math.max(1, Math.min(500, Math.round(Number(value) || 1)));
const cleanLimit = (value) => {
  const limit = Math.round(Number(value) || 50);
  return Math.max(1, Math.min(500, limit));
};
const cleanCoord = (value, min, max) => {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : undefined;
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

    res.json(await Report.find(filter).sort({ date: -1 }).limit(cleanLimit(req.query.limit)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/reports  { disease, sector, location, cases, date? }
router.post('/', async (req, res) => {
  try {
    const disease = cleanText(req.body.disease);
    const sector = cleanText(req.body.sector);
    const location = cleanText(req.body.location);
    if (!disease || !location || !SECTORS.has(sector)) {
      return res.status(400).json({ error: 'disease, sector and location are required' });
    }

    res.status(201).json(await Report.create({
      disease,
      sector,
      location,
      cases: cleanCases(req.body.cases),
      latitude: cleanCoord(req.body.latitude, -90, 90),
      longitude: cleanCoord(req.body.longitude, -180, 180),
      date: req.body.date,
    }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
