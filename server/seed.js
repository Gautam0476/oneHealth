// Fills the database with sample reports (including two planted outbreaks).
require('dotenv').config();
const mongoose = require('mongoose');
const Report = require('./models/Report');
const User = require('./models/User');
const { withReportQuality } = require('./reportQuality');

const cities = ['Jaipur', 'Delhi', 'Lucknow', 'Patna', 'Kolkata', 'Guwahati', 'Mumbai', 'Pune', 'Bhopal', 'Hyderabad', 'Bengaluru', 'Chennai'];
const diseases = {
  human: ['Dengue', 'Leptospirosis', 'Rabies', 'Brucellosis'],
  animal: ['Avian influenza', 'Anthrax', 'Brucellosis', 'Foot-and-mouth'],
  environment: ['Heat index', 'Rainfall anomaly', 'Water contamination'],
};
const species = ['Cattle', 'Buffalo', 'Goat', 'Poultry'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const daysAgo = d => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
const animalMeta = (location, disease, d) => ({
  species: disease === 'Avian influenza' ? 'Poultry' : pick(species),
  symptoms: disease === 'Foot-and-mouth' ? 'lameness, mouth lesions' : disease === 'Brucellosis' ? 'abortion, reduced milk' : 'fever, respiratory signs',
  mortality: disease === 'Avian influenza' ? 2 : d % 4 === 0 ? 1 : 0,
  vaccinationStatus: d % 3 === 0 ? 'unvaccinated' : 'partial',
  confirmationStatus: d <= 2 ? 'lab_confirmed' : 'suspected',
  farmId: `${location.slice(0, 3).toUpperCase()}-${100 + d}`,
  block: location === 'Jaipur' ? 'Amber' : location === 'Guwahati' ? 'Dispur' : 'Central block',
});
const add = (sector, disease, location, cases, d, extra = {}) =>
  data.push(withReportQuality({
    sector,
    disease,
    location,
    cases,
    date: daysAgo(d),
    ...(sector === 'animal' ? animalMeta(location, disease, d) : {}),
    ...extra,
  }, { sourceType: 'seed', sourceName: 'Seed demo dataset', sourceUploadedBy: 'seed' }));

const data = [];
for (let d = 29; d >= 0; d--) {
  for (let i = 0; i < 5; i++) {
    const sector = pick(['human', 'human', 'animal', 'animal', 'environment']);
    add(sector, pick(diseases[sector]), pick(cities), 1 + Math.floor(Math.random() * 3), d);
  }
}
for (let d = 5; d >= 0; d--) { add('animal', 'Brucellosis', 'Jaipur', 4, d); add('human', 'Brucellosis', 'Jaipur', 2, d); }
for (let d = 5; d >= 0; d--) { add('animal', 'Avian influenza', 'Guwahati', 4, d); add('human', 'Avian influenza', 'Guwahati', 1, d); }

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Report.deleteMany({});
  await Report.insertMany(data);
  await Promise.all([
    User.upsertWithPassword({ username: 'admin', password: process.env.ADMIN_PASSWORD || process.env.ADMIN_TOKEN || 'admin123', role: 'admin' }),
    User.upsertWithPassword({ username: 'analyst', password: process.env.ANALYST_PASSWORD || 'analyst123', role: 'analyst' }),
    User.upsertWithPassword({ username: 'viewer', password: process.env.VIEWER_PASSWORD || 'viewer123', role: 'viewer' }),
  ]);
  console.log(`Seeded ${data.length} reports`);
  console.log('Seeded role users');
  await mongoose.disconnect();
})();
