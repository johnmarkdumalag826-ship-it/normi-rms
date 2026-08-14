const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  role: { type: String, enum: ['student', 'adviser', 'coordinator', 'panelist', 'admin'], required: true },
  action: { type: String, required: true },
  ipAddress: String,
  details: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('AuditLog', auditLogSchema);
