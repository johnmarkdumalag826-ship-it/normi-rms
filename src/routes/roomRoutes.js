const express = require('express');
const { listRooms, createRoom } = require('../controllers/roomController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listRooms);
router.post('/', protect, requireRole('admin'), createRoom);

module.exports = router;
