const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
const Course = require('../models/Course');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/audit');
const mailer = require('../utils/mailer');

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
// Who must say which department they belong to when they register, and who must also say which
// program: students and advisers pick both, a coordinator picks only the department.
const NEEDS_DEPARTMENT = ['student', 'adviser', 'coordinator'];
const NEEDS_PROGRAM = ['student', 'adviser'];

const register = async (req, res, next) => {
  const { name, email, password, role, departmentId, courseId } = req.body;
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

  const needsDepartment = NEEDS_DEPARTMENT.includes(role);
  const needsProgram = NEEDS_PROGRAM.includes(role);
  if (needsDepartment) {
    if (!departmentId || (needsProgram && !courseId)) {
      return next(new AppError(needsProgram ? 'Please choose your department and program.' : 'Please choose your department.', 400));
    }
    const department = await Department.findById(departmentId).catch(() => null);
    if (!department) return next(new AppError('Please choose a valid department.', 400));
    if (needsProgram) {
      const course = await Course.findById(courseId).catch(() => null);
      if (!course || String(course.departmentId) !== String(departmentId)) {
        return next(new AppError('Please choose a program that belongs to your department.', 400));
      }
    }
  }

  const user = await User.create({
    name: String(name).trim(), email, password, role, status: 'pending',
    ...(needsDepartment ? { departmentId } : {}),
    ...(needsProgram ? { courseId } : {}),
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

// Anyone signed in can change their own password this way. Nobody else — not even an Admin —
// can ever set it for them (see userController: PATCH /api/users/:id ignores a password field).
const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(new AppError('Please enter your current password and a new password.', 400));
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return next(new AppError('Your new password must be at least 8 characters long.', 400));
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Your current password is not correct.', 401));
  }

  user.password = newPassword; // hashed automatically when saved
  await user.save();
  await logAction(req, 'CHANGE_OWN_PASSWORD', `${user.name} changed their own password.`, user);

  res.json({ user: sanitize(user) });
};

// Anyone signed in can edit their own name and phone number this way — nothing that affects
// who they are in the system (email, role, department, course, account status) is changeable
// here; an Admin still handles those from Manage Accounts.
const updateMe = async (req, res, next) => {
  const { name, phone } = req.body;
  if (name !== undefined && !String(name).trim()) {
    return next(new AppError('Please enter your name.', 400));
  }

  const user = req.user;
  if (name !== undefined) user.name = String(name).trim();
  if (phone !== undefined) user.phone = String(phone).trim();
  await user.save();
  await logAction(req, 'UPDATE_OWN_PROFILE', `${user.name} updated their own profile.`, user);

  res.json({ user: sanitize(user) });
};

const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;

const generateResetCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

// Only the account owner can ever set their password (see changePassword above) — this is how
// they do it without knowing their old one: a 6-digit code emailed to the address on file, which
// proves they control that inbox. The response is the same whether or not the email is registered,
// so this cannot be used to check who has an account.
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError('Please enter your email address.', 400));

  const genericMessage = 'If that email has an account, we sent a 6-digit code to it. The code expires in 15 minutes.';
  const user = await User.findOne({ email: String(email).toLowerCase() });

  if (user) {
    const code = generateResetCode();
    user.resetCodeHash = await bcrypt.hash(code, 10);
    user.resetCodeExpires = new Date(Date.now() + RESET_CODE_TTL_MS);
    user.resetCodeAttempts = 0;
    await user.save({ validateBeforeSave: false });

    try {
      await mailer.sendMail({
        to: user.email,
        subject: 'Your NORMI RMS password reset code',
        text: `Hi ${user.name},\n\nYour password reset code is ${code}. It expires in 15 minutes.\n\nIf you did not ask for this, you can ignore this email — your password will not change.`,
      });
    } catch (err) {
      console.error('Failed to send password reset email:', err);
      return next(new AppError('We could not send the email right now. Please try again later.', 500));
    }
    await logAction(req, 'FORGOT_PASSWORD_REQUEST', `${user.name} asked for a password reset code.`, user);
  }

  res.json({ message: genericMessage });
};

const resetPassword = async (req, res, next) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return next(new AppError('Please enter your email, the code, and a new password.', 400));
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return next(new AppError('Your new password must be at least 8 characters long.', 400));
  }

  const user = await User.findOne({ email: String(email).toLowerCase() })
    .select('+resetCodeHash +resetCodeExpires +resetCodeAttempts');
  if (!user || !user.resetCodeHash || !user.resetCodeExpires || user.resetCodeExpires < new Date()) {
    return next(new AppError('That code is not valid or has expired. Please ask for a new one.', 400));
  }
  if (user.resetCodeAttempts >= MAX_RESET_ATTEMPTS) {
    return next(new AppError('Too many wrong attempts. Please ask for a new code.', 429));
  }

  const matches = await bcrypt.compare(String(code), user.resetCodeHash);
  if (!matches) {
    user.resetCodeAttempts += 1;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('That code is not correct.', 400));
  }

  user.password = newPassword; // hashed automatically when saved
  user.resetCodeHash = undefined;
  user.resetCodeExpires = undefined;
  user.resetCodeAttempts = 0;
  await user.save();
  await logAction(req, 'RESET_OWN_PASSWORD', `${user.name} reset their own password using an emailed code.`, user);

  res.json({ message: 'Your password has been changed. You can now sign in.' });
};

module.exports = { login, register, me, logout, changePassword, updateMe, forgotPassword, resetPassword };
