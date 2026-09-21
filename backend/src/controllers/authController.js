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
  if (user.status === 'pending') {
    return next(new AppError('Your account is waiting for approval. An Admin needs to approve it before you can sign in.', 403));
  }
  if (user.status !== 'active') {
    return next(new AppError('This account has been suspended. Please contact the research office.', 403));
  }

  await logAction(req, 'USER_LOGIN', 'User signed in.', user);
  res.json({ user: sanitize(user), token: signToken(user) });
};

// Anyone can ask for an account, but it starts as "pending" and cannot sign in until an Admin approves it.
// The Admin role can never be requested here: Admin accounts are made with the create-admin script.
const SELF_SERVICE_ROLES = ['student', 'adviser', 'panelist', 'coordinator'];

const register = async (req, res, next) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return next(new AppError('Please fill in your name, email, password and role.', 400));
  }
  if (!SELF_SERVICE_ROLES.includes(role)) return next(new AppError('Please choose a valid role.', 400));
  if (typeof password !== 'string' || password.length < 8) {
    return next(new AppError('Your password must be at least 8 characters long.', 400));
  }
  if (!/^\S+@\S+\.\S+$/.test(String(email))) return next(new AppError('Please enter a valid email address.', 400));

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) return next(new AppError('An account with this email already exists. Try signing in instead.', 409));

  const user = await User.create({
    name: String(name).trim(), email, password, role, status: 'pending',
  });
  await logAction(req, 'USER_SIGN_UP', `${user.name} (${user.email}) registered as a ${role}.`, user);
  res.status(201).json({ message: 'You are registered. You can sign in after an Admin approves your registration.' });
};

const me = async (req, res) => {
  res.json({ user: sanitize(req.user) });
};

const logout = async (req, res) => {
  await logAction(req, 'USER_LOGOUT', 'User signed out.');
  res.status(204).send();
};

module.exports = { login, register, me, logout };
