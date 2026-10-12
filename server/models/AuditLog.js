const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  actor: { type: String, required: true, trim: true, lowercase: true },
  role: { type: String, required: true, trim: true },
  resourceType: { type: String, trim: true },
  resourceId: { type: String, trim: true },
  details: { type: Object, default: {} },
  ip: String,
  userAgent: String,
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
