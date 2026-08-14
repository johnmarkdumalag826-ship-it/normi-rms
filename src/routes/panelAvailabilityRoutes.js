const express = require('express');
const { listAvailability, createAvailability } = require('../controllers/panelAvailabilityController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', listAvailability);
router.post('/', createAvailability);

module.exports = router;
