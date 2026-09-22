const express = require('express');
const { login, register, me, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Sign-up only makes a "pending" account; an Admin must approve it. Limited per address to slow down spam.
const signUps = new Map();
const limitSignUps = (req, res, next) => {
  const now = Date.now();
  const recent = (signUps.get(req.ip) || []).filter(t => now - t < 60 * 60 * 1000);
  if (recent.length >= 10) {
    return res.status(429).json({ message: 'Too many sign-up requests. Please try again later.' });
  }
  signUps.set(req.ip, [...recent, now]);
  next();
};

router.post('/login', login);
router.post('/register', limitSignUps, register);
router.get('/me', protect, me);
router.post('/logout', protect, logout);
router.patch('/change-password', protect, changePassword);

module.exports = router;
