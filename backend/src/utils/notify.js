const SystemNotification = require('../models/SystemNotification');

const notify = (userId, title, message, type = 'info') =>
  SystemNotification.create({ userId, title, message, type });

const notifyMany = (userIds, title, message, type = 'info') =>
  Promise.all(userIds.map((id) => notify(id, title, message, type)));

module.exports = { notify, notifyMany };
