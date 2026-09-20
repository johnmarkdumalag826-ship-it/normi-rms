const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  authorName: { type: String, required: true },
  isPinned: { type: Boolean, default: false },
  category: { type: String, enum: ['general', 'defense', 'deadline', 'repository'], default: 'general' },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Announcement', announcementSchema);
