const express = require('express');
const { listSchoolYears, createSchoolYear } = require('../controllers/schoolYearController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listSchoolYears);
router.post('/', protect, requireRole('admin'), createSchoolYear);

module.exports = router;
