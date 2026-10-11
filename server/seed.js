// Fills the database with sample reports (including two planted outbreaks).
require('dotenv').config();
const mongoose = require('mongoose');
const Report = require('./models/Report');

const cities = ['Jaipur', 'Delhi', 'Lucknow', 'Patna', 'Kolkata', 'Guwahati', 'Mumbai', 'Pune', 'Bhopal', 'Hyderabad', 'Bengaluru', 'Chennai'];
const diseases = {
  human: ['Dengue', 'Leptospirosis', 'Rabies', 'Brucellosis'],
  animal: ['Avian influenza', 'Anthrax', 'Brucellosis', 'Foot-and-mouth'],
  environment: ['Heat index', 'Rainfall anomaly', 'Water contamination'],
};
const pick = a => a[Math.floor(Math.random() * a.length)];
const daysAgo = d => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
const add = (sector, disease, location, cases, d) => data.push({ sector, disease, location, cases, date: daysAgo(d) });

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
  console.log(`Seeded ${data.length} reports`);
  await mongoose.disconnect();
})();
