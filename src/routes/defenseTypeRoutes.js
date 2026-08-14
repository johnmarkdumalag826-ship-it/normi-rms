const express = require('express');
const { listDefenseTypes, createDefenseType, deleteDefenseType } = require('../controllers/defenseTypeController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listDefenseTypes);
router.post('/', protect, requireRole('admin', 'coordinator'), createDefenseType);
router.delete('/:id', protect, requireRole('admin', 'coordinator'), deleteDefenseType);

module.exports = router;
