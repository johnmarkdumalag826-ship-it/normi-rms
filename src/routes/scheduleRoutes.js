const express = require('express');
const {
  listSchedules, createSchedule, updateSchedule, cancelSchedule, deleteSchedule, clearDraftSchedules, autoGenerate,
} = require('../controllers/scheduleController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', listSchedules);
router.post('/', requireRole('coordinator', 'admin'), createSchedule);
router.post('/auto-generate', requireRole('coordinator', 'admin'), autoGenerate);
router.delete('/clear-drafts', requireRole('coordinator', 'admin'), clearDraftSchedules);
router.patch('/:id', requireRole('coordinator', 'admin'), updateSchedule);
router.patch('/:id/cancel', requireRole('coordinator', 'admin'), cancelSchedule);
router.delete('/:id', requireRole('coordinator', 'admin'), deleteSchedule);

module.exports = router;
