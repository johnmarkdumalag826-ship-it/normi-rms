const express = require('express');
const { listAnnouncements, createAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listAnnouncements);
router.post('/', protect, requireRole('coordinator', 'admin'), createAnnouncement);
router.delete('/:id', protect, requireRole('coordinator', 'admin'), deleteAnnouncement);

module.exports = router;
