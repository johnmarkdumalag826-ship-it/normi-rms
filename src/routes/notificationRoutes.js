const express = require('express');
const { listNotifications, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', listNotifications);
router.patch('/read-all', markAllRead);

module.exports = router;
