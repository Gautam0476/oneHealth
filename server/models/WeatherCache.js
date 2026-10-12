const mongoose = require('mongoose');

const weatherCacheSchema = new mongoose.Schema({
  location: { type: String, required: true, unique: true, trim: true, index: true },
  latitude: Number,
  longitude: Number,
  temperature: Number,
  rainfall: Number,
  tempAnomaly: { type: Number, default: 0 },
  rainfallAnomaly: { type: Number, default: 0 },
  source: { type: String, default: 'open-meteo' },
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('WeatherCache', weatherCacheSchema);
