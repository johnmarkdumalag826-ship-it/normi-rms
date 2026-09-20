const AuditLog = require('../models/AuditLog');

// `actor` override lets routes without the `protect` middleware (e.g. login, which
// authenticates the user mid-handler rather than beforehand) still log correctly.
const logAction = async (req, action, details, actor) => {
  const user = actor || req.user;
  await AuditLog.create({
    userId: user._id,
    userName: user.name,
    role: user.role,
    action,
    ipAddress: req.ip,
    details,
  });
};

module.exports = { logAction };
