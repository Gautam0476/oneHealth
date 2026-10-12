const router = require('express').Router();
const mongoose = require('mongoose');
const WeatherCache = require('../models/WeatherCache');

const memoryCache = new Map();
const CACHE_MS = 3 * 60 * 60 * 1000;
const MAX_POINTS = 12;

const round = (value, digits = 1) => Number(Number(value || 0).toFixed(digits));
const cleanText = (value) => String(value || '').trim().slice(0, 80);
const decodeText = (value) => {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
  } catch {
    return String(value || '');
  }
};
const roughBaselineTemp = (lat) => Math.max(18, Math.min(31, 29 - (Number(lat) - 22) * 0.12));

function parsePoints(raw) {
  return String(raw || '')
    .split('|')
    .map((entry) => {
      const [location, latitude, longitude] = entry.split(':');
      const lat = Number(latitude);
      const lon = Number(longitude);
      const decodedLocation = cleanText(decodeText(location));
      if (!decodedLocation || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
      return { location: decodedLocation, latitude: lat, longitude: lon };
    })
    .filter(Boolean)
    .slice(0, MAX_POINTS);
}

async function cached(location) {
  const memory = memoryCache.get(location);
  if (memory && memory.expiresAt > Date.now()) return memory.payload;

  if (mongoose.connection.readyState !== 1) return null;
  const cachedWeather = await WeatherCache.findOne({ location, expiresAt: { $gt: new Date() } }).lean();
  if (!cachedWeather) return null;
  return {
    location,
    temperature: cachedWeather.temperature,
    rainfall: cachedWeather.rainfall,
    tempAnomaly: cachedWeather.tempAnomaly,
    rainfallAnomaly: cachedWeather.rainfallAnomaly,
    source: cachedWeather.source,
    fetchedAt: cachedWeather.fetchedAt,
  };
}

async function save(weather) {
  const expiresAt = new Date(Date.now() + CACHE_MS);
  memoryCache.set(weather.location, { payload: weather, expiresAt: expiresAt.getTime() });

  if (mongoose.connection.readyState !== 1) return;
  await WeatherCache.findOneAndUpdate(
    { location: weather.location },
    { ...weather, expiresAt },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

async function fetchWeather(point) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', point.latitude);
    url.searchParams.set('longitude', point.longitude);
    url.searchParams.set('current', 'temperature_2m,rain,precipitation');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`weather ${response.status}`);
    const payload = await response.json();
    const current = payload.current || {};
    const temperature = round(current.temperature_2m);
    const rainfall = round(Number(current.rain || 0) + Number(current.precipitation || 0));
    const tempAnomaly = round(temperature - roughBaselineTemp(point.latitude));
    const rainfallAnomaly = round(Math.min(100, rainfall * 25), 0);

    const weather = {
      location: point.location,
      latitude: point.latitude,
      longitude: point.longitude,
      temperature,
      rainfall,
      tempAnomaly,
      rainfallAnomaly,
      source: 'open-meteo',
      fetchedAt: new Date(),
    };
    await save(weather);
    return weather;
  } finally {
    clearTimeout(timer);
  }
}

router.get('/weather', async (req, res) => {
  const points = parsePoints(req.query.points);
  if (!points.length) return res.status(400).json({ error: 'points query is required as City:lat:lon|City:lat:lon' });

  const readings = await Promise.all(points.map(async (point) => {
    const hit = await cached(point.location);
    if (hit) return hit;
    try {
      return await fetchWeather(point);
    } catch {
      return {
        location: point.location,
        temperature: null,
        rainfall: null,
        tempAnomaly: 0,
        rainfallAnomaly: 0,
        source: 'fallback',
        fetchedAt: new Date(),
      };
    }
  }));

  res.json({
    source: readings.some((item) => item.source === 'open-meteo') ? 'open-meteo' : 'fallback',
    readings,
    env: Object.fromEntries(readings.map((item) => [item.location, [item.tempAnomaly, item.rainfallAnomaly]])),
  });
});

module.exports = router;
