const mongoose = require('mongoose');

const proposalFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  category: {
    type: String,
    enum: ['proposal_document', 'research_summary', 'supporting_files', 'other_attachments', 'title_list'],
    required: true,
  },
}, { _id: false });

const researchSchema = new mongoose.Schema({
  // A group is registered first; its title and summary come with the title proposal, after the
  // title hearing, so they are empty until then.
  groupName: String,
  title: { type: String, default: '' },
  abstract: { type: String, default: '' },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  schoolYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolYear', required: true },
  status: {
    type: String,
    enum: ['Group Registered', 'Submitted', 'Under Review', 'Revision Required', 'Approved by Adviser',
           'Pending Coordinator', 'Scheduled', 'Completed', 'Archived'],
    default: 'Submitted',
  },
  // The first student is the group leader (the person who registered the group).
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // The other group members, as typed by the leader. They may not have an account.
  memberNames: [String],
  adviserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  panelistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  keywords: [String],
  viewCount: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 },
  proposalFiles: [proposalFileSchema],
}, { timestamps: true });

module.exports = mongoose.model('Research', researchSchema);
