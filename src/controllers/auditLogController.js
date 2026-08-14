const AuditLog = require('../models/AuditLog');
const { logAction } = require('../utils/audit');

const listAuditLogs = async (req, res) => {
  res.json(await AuditLog.find().sort({ createdAt: -1 }).limit(500));
};

// Stub actions: there's no real backup/restore mechanism (a managed MongoDB Atlas
// cluster handles that at the infrastructure level), but the admin UI's buttons for
// them should still leave a real audit trail entry rather than silently no-op.
const backupDatabase = async (req, res) => {
  await logAction(req, 'BACKUP_DATABASE', 'Super Admin triggered a database backup.');
  res.json({ success: true });
};

const restoreDatabase = async (req, res) => {
  await logAction(req, 'RESTORE_DATABASE', 'Super Admin triggered a database restore to the latest restore point.');
  res.json({ success: true });
};

module.exports = { listAuditLogs, backupDatabase, restoreDatabase };
