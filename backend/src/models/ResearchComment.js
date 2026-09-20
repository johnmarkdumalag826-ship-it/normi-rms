const mongoose = require('mongoose');

const researchCommentSchema = new mongoose.Schema({
  researchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Research', required: true },
  versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchVersion', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  authorRole: { type: String, enum: ['student', 'adviser', 'coordinator', 'panelist', 'admin'], required: true },
  chapter: { type: String, enum: ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'general'], required: true },
  text: { type: String, required: true },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'commentAt', updatedAt: true } });

module.exports = mongoose.model('ResearchComment', researchCommentSchema);
