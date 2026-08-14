const mongoose = require('mongoose');

const proposalFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  category: {
    type: String,
    enum: ['proposal_document', 'research_summary', 'supporting_files', 'other_attachments'],
    required: true,
  },
}, { _id: false });

const researchSchema = new mongoose.Schema({
  title: { type: String, required: true },
  abstract: { type: String, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  schoolYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolYear', required: true },
  status: {
    type: String,
    enum: ['Submitted', 'Under Review', 'Revision Required', 'Approved by Adviser',
           'Pending Coordinator', 'Scheduled', 'Completed', 'Archived'],
    default: 'Submitted',
  },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  adviserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  panelistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  keywords: [String],
  viewCount: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 },
  proposalFiles: [proposalFileSchema],
}, { timestamps: true });

module.exports = mongoose.model('Research', researchSchema);
