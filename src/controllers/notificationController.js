const SystemNotification = require('../models/SystemNotification');

const listNotifications = async (req, res) => {
  const notifications = await SystemNotification.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(notifications);
};

const markAllRead = async (req, res) => {
  await SystemNotification.updateMany({ userId: req.user._id }, { read: true });
  res.json({ success: true });
};

module.exports = { listNotifications, markAllRead };
