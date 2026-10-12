const test = require('node:test');
const assert = require('node:assert/strict');
const detect = require('../detect');

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-12T00:00:00.000Z');

const report = ({ day, location = 'Jaipur', sector = 'animal', disease = 'Brucellosis', cases = 1 }) => ({
  location,
  sector,
  disease,
  cases,
  date: new Date(NOW.getTime() - day * DAY),
});

test('detect flags a city when recent reports cross the alert thresholds', async () => {
  const reports = [];

  for (let day = 7; day < 30; day += 1) reports.push(report({ day, cases: 1 }));
  for (let day = 0; day < 7; day += 1) reports.push(report({ day, cases: 3 }));

  const alerts = await detect(reports, NOW);

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].location, 'Jaipur');
  assert.equal(alerts[0].disease, 'Brucellosis');
  assert.equal(alerts[0].recent, 21);
  assert.equal(alerts[0].level, 'high');
  assert.ok(alerts[0].mlScore >= 0.5);
  assert.ok(alerts[0].drivers.some((driver) => driver.startsWith('ML anomaly score')));
  assert.ok(alerts[0].drivers.includes('weather anomaly'));
});

test('detect does not flag steady baseline activity', async () => {
  const reports = [];

  for (let day = 0; day < 30; day += 1) reports.push(report({ day, location: 'Delhi', cases: 1 }));

  assert.deepEqual(await detect(reports, NOW), []);
});

test('detect ignores future and older-than-window reports', async () => {
  const reports = [
    report({ day: -1, cases: 100 }),
    report({ day: 30, cases: 100 }),
    report({ day: 0, cases: 1 }),
  ];

  assert.deepEqual(await detect(reports, NOW), []);
});
