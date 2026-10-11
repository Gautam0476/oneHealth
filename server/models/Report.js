const mongoose = require('mongoose');

module.exports = mongoose.model('Report', new mongoose.Schema({
  disease:  { type: String, required: true, trim: true },
  sector:   { type: String, required: true, enum: ['human', 'animal', 'environment'] },
  location: { type: String, required: true, trim: true },
  latitude: { type: Number, min: -90, max: 90 },
  longitude:{ type: Number, min: -180, max: 180 },
  cases:    { type: Number, default: 1, min: 1, max: 500 },
  date:     { type: Date, default: Date.now, index: true },
}));
