const express = require('express');
const { listUsers, listDirectory, updateUser, createUser, deleteUser, forcePasswordReset } = require('../controllers/userController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/directory', protect, listDirectory);

router.use(protect, requireRole('admin'));
router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.post('/:id/force-password-reset', forcePasswordReset);
router.delete('/:id', deleteUser);

module.exports = router;
