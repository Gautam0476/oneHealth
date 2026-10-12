const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReportCsvBuffer } = require('../csvImport');

test('csv import converts compatible rows into Mongo report documents', async () => {
  const csv = [
    'city,sector,disease,cases,date,lat,lon,species,symptoms,mortality,vaccination_status,confirmation_status,farm_id,block',
    'Jaipur,animal,Brucellosis,4,2026-10-12,26.91,75.79,Cattle,"abortion, fever",1,unvaccinated,lab_confirmed,JPR-14,Amber',
    'Delhi,human,Dengue,2,12/10/2026,28.61,77.21',
  ].join('\n');

  const parsed = await parseReportCsvBuffer(Buffer.from(csv));

  assert.equal(parsed.error, undefined);
  assert.equal(parsed.skipped, 0);
  assert.equal(parsed.reports.length, 2);
  assert.deepEqual(parsed.reports[0], {
    disease: 'Brucellosis',
    sector: 'animal',
    location: 'Jaipur',
    cases: 4,
    latitude: 26.91,
    longitude: 75.79,
    species: 'Cattle',
    symptoms: 'abortion, fever',
    mortality: 1,
    vaccinationStatus: 'unvaccinated',
    confirmationStatus: 'lab_confirmed',
    farmId: 'JPR-14',
    block: 'Amber',
    date: new Date('2026-10-12T00:00:00.000Z'),
  });
});

test('csv import reports missing required headers', async () => {
  const parsed = await parseReportCsvBuffer(Buffer.from('city,disease\nJaipur,Dengue'));

  assert.match(parsed.error, /cases\/count\/value/);
  assert.equal(parsed.reports.length, 0);
  assert.equal(parsed.skipped, 1);
});
