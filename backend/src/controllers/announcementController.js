const Announcement = require('../models/Announcement');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/audit');

const listAnnouncements = async (req, res) => {
  res.json(await Announcement.find().sort({ isPinned: -1, createdAt: -1 }));
};

const createAnnouncement = async (req, res) => {
  const announcement = await Announcement.create({ ...req.body, authorName: req.user.name });
  await logAction(req, 'CREATE_ANNOUNCEMENT', `Published institutional bulletin: "${announcement.title}"`);
  res.status(201).json(announcement);
};

const deleteAnnouncement = async (req, res, next) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);
  if (!announcement) return next(new AppError('Announcement not found', 404));
  await logAction(req, 'DELETE_ANNOUNCEMENT', `Deleted institutional bulletin ID: ${req.params.id}`);
  res.status(204).send();
};

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
