const express = require('express');
const { login, register, me, logout, changePassword, updateMe, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// A small helper for the two rate limits below: at most `max` requests per address within an hour.
const rateLimiter = (max) => {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter(t => now - t < 60 * 60 * 1000);
    if (recent.length >= max) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }
    hits.set(req.ip, [...recent, now]);
    next();
  };
};

// Sign-up only makes a "pending" account; an Admin must approve it. Limited per address to slow down spam.
const limitSignUps = rateLimiter(10);
// Forgot-password sends a real email, and reset-password lets someone guess a 6-digit code —
// both are limited per address on top of the code's own expiry and per-account attempt limit.
const limitForgotPassword = rateLimiter(5);
const limitResetPassword = rateLimiter(20);

router.post('/login', login);
router.post('/register', limitSignUps, register);
router.get('/me', protect, me);
router.patch('/me', protect, updateMe);
router.post('/logout', protect, logout);
router.patch('/change-password', protect, changePassword);
router.post('/forgot-password', limitForgotPassword, forgotPassword);
router.post('/reset-password', limitResetPassword, resetPassword);

module.exports = router;
