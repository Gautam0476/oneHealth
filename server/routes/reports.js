const router = require('express').Router();
const multer = require('multer');
const Report = require('../models/Report');
const { requirePermission, writeAudit } = require('../auth');
const { parseReportCsvBuffer } = require('../csvImport');

const SECTORS = new Set(['human', 'animal', 'environment']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) return callback(null, true);
    return callback(new Error('Only CSV files are allowed'));
  },
});
const csvUpload = upload.single('file');
const cleanText = (value) => String(value ?? '').trim();
const cleanOptionalText = (value, max = 80) => {
  const text = cleanText(value).slice(0, max);
  return text || undefined;
};
const cleanCases = (value) => {
  const cases = Number(value);
  if (!Number.isFinite(cases) || cases < 1 || cases > 500) return null;
  return Math.round(cases);
};
const cleanCount = (value, max = 500) => {
  if (value === undefined || value === null || value === '') return 0;
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0 || count > max) return null;
  return Math.round(count);
};
const cleanEnum = (value, allowed, fallback) => {
  const key = cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return allowed.has(key) ? key : fallback;
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

const handleCsvUpload = (req, res, next) => {
  csvUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'CSV file must be 2 MB or smaller' });
    return res.status(400).json({ error: err.message });
  });
};

// POST /api/reports/import-csv  multipart/form-data file=<csv>
router.post('/import-csv', requirePermission('reports:write'), handleCsvUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file is required' });

    const parsed = await parseReportCsvBuffer(req.file.buffer);
    if (parsed.error) return res.status(400).json(parsed);

    const inserted = await Report.insertMany(parsed.reports, { ordered: false });
    await writeAudit('reports.csv.imported', req.user, {
      fileName: req.file.originalname,
      inserted: inserted.length,
      skipped: parsed.skipped,
    }, req);

    return res.status(201).json({
      inserted: inserted.length,
      skipped: parsed.skipped,
      fileName: req.file.originalname,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/reports  { disease, sector, location, cases, date? }
router.post('/', requirePermission('reports:write'), async (req, res) => {
  try {
    const disease = cleanText(req.body.disease);
    const sector = cleanText(req.body.sector);
    const location = cleanText(req.body.location);
    if (!disease || !location || !SECTORS.has(sector)) {
      return res.status(400).json({ error: 'disease, sector and location are required' });
    }

    const cases = cleanCases(req.body.cases);
    const mortality = cleanCount(req.body.mortality);
    const latitude = cleanCoord(req.body.latitude, -90, 90);
    const longitude = cleanCoord(req.body.longitude, -180, 180);
    const date = cleanDate(req.body.date);

    if (!cases) return res.status(400).json({ error: 'cases must be a number from 1 to 500' });
    if (mortality === null) return res.status(400).json({ error: 'mortality must be a number from 0 to 500' });
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
      species: cleanOptionalText(req.body.species, 60),
      symptoms: cleanOptionalText(req.body.symptoms, 240),
      mortality,
      vaccinationStatus: cleanEnum(req.body.vaccinationStatus, new Set(['unknown', 'vaccinated', 'partial', 'unvaccinated']), 'unknown'),
      confirmationStatus: cleanEnum(req.body.confirmationStatus, new Set(['suspected', 'lab_confirmed']), 'suspected'),
      farmId: cleanOptionalText(req.body.farmId, 80),
      block: cleanOptionalText(req.body.block, 80),
      date,
    }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
