const mongoose = require('mongoose');

const chapterStatusSchema = new mongoose.Schema({
  status: { type: String, enum: ['Pending', 'Approved', 'Revision Required', 'Not Submitted'], default: 'Not Submitted' },
  feedback: String,
  lastUpdated: Date,
}, { _id: false });

const researchVersionSchema = new mongoose.Schema({
  researchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Research', required: true },
  versionNumber: { type: Number, required: true },
  title: { type: String, required: true },
  abstract: { type: String, required: true },
  fileUrl: String,
  fileName: String,
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  annotatedFileUrl: String,
  annotatedFileName: String,
  type: { type: String, enum: ['adviser_check', 'defense_manuscript'] },
  chapters: {
    chapter1: chapterStatusSchema,
    chapter2: chapterStatusSchema,
    chapter3: chapterStatusSchema,
    chapter4: chapterStatusSchema,
    chapter5: chapterStatusSchema,
  },
}, { timestamps: { createdAt: 'submittedAt', updatedAt: true } });

module.exports = mongoose.model('ResearchVersion', researchVersionSchema);
