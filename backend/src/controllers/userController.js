const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/audit');

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
  // True right after an Admin starts a password reset — the person must set their own new password.
  mustChangePassword: user.mustChangePassword,
  registeredAt: user.createdAt,
});

const listUsers = async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users.map(sanitize));
};

// Minimal-field roster for any authenticated role — populating adviser/panelist
// pickers, sidebar role emulation, comment author display, etc. Unlike listUsers
// (admin-only, full fields), this is intentionally readable by every role.
const listDirectory = async (req, res) => {
  const filter = { status: 'active' };
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter);
  res.json(users.map(sanitize));
};

// Handles handleToggleUserStatus / handleUpdateUserRole / handleUpdateUser (profile fields) in one generic PATCH.
// An Admin can never set someone's password here — only that person can, via change-password
// or by using the one-time code from forcePasswordReset below.
const updateUser = async (req, res, next) => {
  const { status, role, name, avatar, departmentId, courseId, phone, email } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));

  if (status && status !== user.status) {
    user.status = status;
    await logAction(req, 'TOGGLE_USER_STATUS', `Super Admin set account status of ${user.name} to: ${status}`);
  }
  if (role && role !== user.role) {
    user.role = role;
    await logAction(req, 'UPDATE_USER_ROLE', `Super Admin updated role of ${user.name} to: ${role}`);
  }
  if (email !== undefined && email.toLowerCase() !== user.email) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return next(new AppError('An account with this email already exists', 409));
    user.email = email.toLowerCase();
  }
  if (name !== undefined) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;
  if (departmentId !== undefined) user.departmentId = departmentId;
  if (courseId !== undefined) user.courseId = courseId;
  if (phone !== undefined) user.phone = phone;

  await user.save();
  if (name !== undefined || avatar !== undefined || departmentId !== undefined || courseId !== undefined || phone !== undefined || email !== undefined) {
    await logAction(req, 'UPDATE_USER_PROFILE', `Updated user profile/researcher information for: ${user.name}`);
  }

  res.json(sanitize(user));
};

// Admin directly provisioning a new account (handleAddUserAccount)
const createUser = async (req, res, next) => {
  const { email, password, name, role, departmentId, courseId, phone } = req.body;
  if (!email || !password || !name || !role) {
    return next(new AppError('email, password, name, and role are required', 400));
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return next(new AppError('An account with this email already exists', 409));

  const user = await User.create({ email, password, name, role, departmentId, courseId, phone, status: 'active' });
  await logAction(req, 'REGISTER_USER_ACCOUNT', `Academic account registered: ${user.name} (${user.email})`);
  res.status(201).json(sanitize(user));
};

const deleteUser = async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return next(new AppError('User not found', 404));
  await logAction(req, 'DELETE_USER_ACCOUNT', `Academic account deleted: ID ${req.params.id}`);
  res.status(204).send();
};

// Letters and numbers only, no easily-confused characters (no 0/O, 1/l/I).
const randomTempCode = () => {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(10), (b) => letters[b % letters.length]).join('');
};

// An Admin cannot choose someone's password. Instead this starts a reset: a one-time code is
// generated and handed back to the Admin (once) to give the person out of band. The code works
// as their password exactly once — signing in with it forces them straight to "Set a new
// password", where they choose their own real password (see authController.changePassword).
const forcePasswordReset = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));

  const tempPassword = randomTempCode();
  user.password = tempPassword; // hashed automatically when saved
  user.mustChangePassword = true;
  await user.save();
  await logAction(req, 'FORCE_PASSWORD_RESET', `Admin started a password reset for ${user.name}. They must set their own new password at next sign-in.`);

  res.json({ tempPassword });
};

module.exports = { listUsers, listDirectory, updateUser, createUser, deleteUser, forcePasswordReset };
