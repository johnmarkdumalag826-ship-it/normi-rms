const AuditLog = require('../models/AuditLog');

const listAuditLogs = async (req, res) => {
  res.json(await AuditLog.find().sort({ createdAt: -1 }).limit(500));
};

module.exports = { listAuditLogs };
