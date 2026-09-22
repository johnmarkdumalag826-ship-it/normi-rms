const express = require('express');
const { listUsers, listDirectory, updateUser, deleteUser } = require('../controllers/userController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/directory', protect, listDirectory);

router.use(protect, requireRole('admin'));
router.get('/', listUsers);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
