const express = require('express');
const { listCourses, createCourse } = require('../controllers/courseController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listCourses);
router.post('/', protect, requireRole('admin'), createCourse);

module.exports = router;
