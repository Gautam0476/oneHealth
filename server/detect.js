// Multivariate early-warning engine for One Health reports.
// It flags city-level spikes and explains why each alert was raised.
const DAY = 24 * 60 * 60 * 1000;
const ALERT_RULES = {
  minRecent: 8,
  minRatio: 1.8,
  minZ: 2,
};

const ENV = {
  Jaipur: [3.8, -30],
  Guwahati: [1.2, 64],
};

const CORRIDORS = [
  ['Jaipur', 'Delhi', 1800],
  ['Jaipur', 'Lucknow', 900],
  ['Jaipur', 'Bhopal', 700],
  ['Guwahati', 'Kolkata', 1500],
  ['Guwahati', 'Patna', 800],
  ['Mumbai', 'Pune', 1400],
  ['Bhopal', 'Mumbai', 1100],
  ['Hyderabad', 'Bengaluru', 1300],
  ['Chennai', 'Bengaluru', 900],
  ['Lucknow', 'Delhi', 1200],
  ['Patna', 'Kolkata', 1000],
];

const sum = (values, from, to) => values.slice(from, to).reduce((total, value) => total + value, 0);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function anomalyConfidence(stats, sectorsUp, envOdd, load) {
  const ratioScore = clamp((stats.ratio - ALERT_RULES.minRatio) * 14, 0, 22);
  const zScore = clamp((stats.z - ALERT_RULES.minZ) * 9, 0, 22);
  const volumeScore = clamp((stats.recent - ALERT_RULES.minRecent) * 1.2, 0, 14);
  const sectorScore = sectorsUp * 7;
  const contextScore = (envOdd ? 8 : 0) + clamp(load / 500, 0, 8);
  return clamp(Math.round(48 + ratioScore + zScore + volumeScore + sectorScore + contextScore), 50, 99);
}

function detect(reports, now = new Date()) {
  const cities = {};

  for (const report of reports) {
    const day = Math.floor((now - new Date(report.date)) / DAY);
    if (day < 0 || day > 29) continue;
    const city = (cities[report.location] ??= { all: Array(30).fill(0), sector: {}, disease: {} });
    city.all[day] += report.cases;
    (city.sector[report.sector] ??= Array(30).fill(0))[day] += report.cases;
    if (day < 7) city.disease[report.disease] = (city.disease[report.disease] || 0) + report.cases;
  }

  const alerts = [];

  for (const [location, city] of Object.entries(cities)) {
    const base = city.all.slice(7);
    const mean = base.reduce((total, value) => total + value, 0) / base.length;
    const sd = Math.sqrt(base.reduce((total, value) => total + (value - mean) ** 2, 0) / base.length) || 1;
    const recent = sum(city.all, 0, 7);
    const recentMean = recent / 7;
    const ratio = recentMean / Math.max(mean, 0.3);
    const z = (recentMean - mean) / sd;

    if (recent < ALERT_RULES.minRecent || ratio < ALERT_RULES.minRatio || z < ALERT_RULES.minZ) continue;

    const sectorsUp = Object.values(city.sector)
      .filter((series) => sum(series, 0, 7) >= 2 && sum(series, 0, 7) > (sum(series, 7, 28) / 3) * 1.3)
      .length;
    const corridors = CORRIDORS.filter(([from]) => from === location);
    const load = corridors.reduce((total, route) => total + route[2], 0);
    const env = ENV[location] ?? [0, 0];
    const envOdd = Math.abs(env[0]) >= 3 || Math.abs(env[1]) >= 40;
    const confidence = anomalyConfidence({ ratio, z, recent }, sectorsUp, envOdd, load);
    const risk = Math.min(99, Math.round(confidence * 0.72 + sectorsUp * 5 + (envOdd ? 8 : 0) + Math.min(load / 450, 7)));
    const disease = Object.entries(city.disease).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown signal';
    const drivers = [
      `${ratio.toFixed(1)}x usual activity`,
      `z-score ${z.toFixed(1)}`,
      sectorsUp ? `${sectorsUp} sector${sectorsUp === 1 ? '' : 's'} rising` : null,
      envOdd ? 'weather anomaly' : null,
      load ? `${load.toLocaleString('en-IN')} animals/week on outbound corridors` : null,
    ].filter(Boolean);

    alerts.push({
      location,
      disease,
      recent,
      usual: +(mean * 7).toFixed(1),
      ratio: +ratio.toFixed(1),
      z: +z.toFixed(1),
      sectorsUp,
      envOdd,
      corridorLoad: load,
      confidence,
      risk,
      drivers,
      level: risk >= 65 ? 'high' : 'medium',
    });
  }

  return alerts.sort((a, b) => b.risk - a.risk);
}

module.exports = detect;
