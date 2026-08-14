const express = require('express');
const { listAuditLogs, backupDatabase, restoreDatabase } = require('../controllers/auditLogController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect, requireRole('admin'));
router.get('/', listAuditLogs);
router.post('/backup', backupDatabase);
router.post('/restore', restoreDatabase);

module.exports = router;
