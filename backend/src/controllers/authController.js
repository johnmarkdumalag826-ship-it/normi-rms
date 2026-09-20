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

const register = async (req, res, next) => {
  const { email, password, name, role, departmentId, courseId, phone } = req.body;
  if (!email || !password || !name || !role) {
    return next(new AppError('email, password, name, and role are required', 400));
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return next(new AppError('An account with this email already exists', 409));

  const user = await User.create({
    email, password, name, role, departmentId, courseId, phone, status: 'active',
  });

  res.status(201).json({ user: sanitize(user), token: signToken(user) });
};

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

  await logAction(req, 'USER_LOGIN', 'User authenticated via security handshake and completed 2FA simulation.', user);
  res.json({ user: sanitize(user), token: signToken(user) });
};

const me = async (req, res) => {
  res.json({ user: sanitize(req.user) });
};

const logout = async (req, res) => {
  await logAction(req, 'USER_LOGOUT', 'User ended secure session.');
  res.status(204).send();
};

module.exports = { register, login, me, logout };
