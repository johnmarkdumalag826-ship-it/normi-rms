const express = require('express');
const { listDepartments, createDepartment } = require('../controllers/departmentController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listDepartments);
router.post('/', protect, requireRole('admin'), createDepartment);

module.exports = router;
