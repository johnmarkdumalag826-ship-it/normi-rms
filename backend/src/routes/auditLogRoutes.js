const express = require('express');
const { listAuditLogs } = require('../controllers/auditLogController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect, requireRole('admin'));
router.get('/', listAuditLogs);

module.exports = router;
