const mongoose = require('mongoose');

module.exports = mongoose.model('Report', new mongoose.Schema({
  disease:  { type: String, required: true, trim: true },
  sector:   { type: String, required: true, enum: ['human', 'animal', 'environment'] },
  location: { type: String, required: true, trim: true },
  latitude: { type: Number, min: -90, max: 90 },
  longitude:{ type: Number, min: -180, max: 180 },
  cases:    { type: Number, default: 1, min: 1, max: 500 },
  species:  { type: String, trim: true, maxlength: 60 },
  symptoms: { type: String, trim: true, maxlength: 240 },
  mortality:{ type: Number, default: 0, min: 0, max: 500 },
  vaccinationStatus: { type: String, enum: ['unknown', 'vaccinated', 'partial', 'unvaccinated'], default: 'unknown' },
  confirmationStatus: { type: String, enum: ['suspected', 'lab_confirmed'], default: 'suspected' },
  farmId:   { type: String, trim: true, maxlength: 80 },
  block:    { type: String, trim: true, maxlength: 80 },
  sourceType: { type: String, enum: ['manual', 'csv', 'seed', 'demo'], default: 'manual', index: true },
  sourceName: { type: String, trim: true, maxlength: 120 },
  sourceUploadedBy: { type: String, trim: true, maxlength: 80 },
  sourceUploadedAt: { type: Date },
  dataQualityScore: { type: Number, default: 70, min: 0, max: 100, index: true },
  qualityFlags: [{ type: String, trim: true, maxlength: 60 }],
  date:     { type: Date, default: Date.now, index: true },
}));
