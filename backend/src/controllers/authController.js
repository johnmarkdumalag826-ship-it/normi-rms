const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/audit');

const signToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const sanitize = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatar: user.avatar,
  departmentId: user.departmentId,
  courseId: user.courseId,
  phone: user.phone,
  status: user.status,
  registeredAt: user.createdAt,
});

const login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new AppError('email and password are required', 400));

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }
  if (user.status !== 'active') {
    return next(new AppError('This account has been suspended or is pending approval', 403));
  }

  await logAction(req, 'USER_LOGIN', 'User signed in.', user);
  res.json({ user: sanitize(user), token: signToken(user) });
};

const me = async (req, res) => {
  res.json({ user: sanitize(req.user) });
};

const logout = async (req, res) => {
  await logAction(req, 'USER_LOGOUT', 'User signed out.');
  res.status(204).send();
};

module.exports = { login, me, logout };
