const Research = require('../models/Research');
const ResearchVersion = require('../models/ResearchVersion');
const Department = require('../models/Department');
const Course = require('../models/Course');
const SchoolYear = require('../models/SchoolYear');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/audit');
const { notify, notifyMany } = require('../utils/notify');

const blankChapters = () => ({
  chapter1: { status: 'Pending' },
  chapter2: { status: 'Pending' },
  chapter3: { status: 'Pending' },
  chapter4: { status: 'Not Submitted' },
  chapter5: { status: 'Not Submitted' },
});

const listResearch = async (req, res) => {
  const filter = {};
  if (req.query.studentId) filter.studentIds = req.query.studentId;
  if (req.query.adviserId) filter.adviserId = req.query.adviserId;
  if (req.query.status) filter.status = req.query.status;
  res.json(await Research.find(filter).sort({ createdAt: -1 }));
};

const getResearch = async (req, res, next) => {
  const research = await Research.findById(req.params.id);
  if (!research) return next(new AppError('Research not found', 404));
  res.json(research);
};

// Student submits a new title proposal (handleCreateTitleProposal)
const createResearch = async (req, res, next) => {
  const { title, abstract, keywords, adviserId, fileName, proposalFiles } = req.body;
  if (!title || !abstract || !adviserId) {
    return next(new AppError('title, abstract, and adviserId are required', 400));
  }

  const user = req.user;
  const departmentId = user.departmentId || (await Department.findOne().sort({ name: 1 }))?._id;
  const courseId = user.courseId || (await Course.findOne().sort({ name: 1 }))?._id;
  const currentYear = await SchoolYear.findOne({ isCurrent: true }) || (await SchoolYear.findOne().sort({ name: -1 }));

  const research = await Research.create({
    title, abstract, keywords: keywords || [],
    departmentId, courseId, schoolYearId: currentYear?._id,
    studentIds: [user._id], adviserId, panelistIds: [],
    status: 'Submitted', viewCount: 0, downloadCount: 0,
    proposalFiles: proposalFiles || [],
  });

  await ResearchVersion.create({
    researchId: research._id, versionNumber: 1, title, abstract,
    fileUrl: fileName ? `manuscripts/${fileName}` : undefined, fileName,
    submittedBy: user._id, chapters: blankChapters(),
  });

  await notify(adviserId, 'New Research Title Proposal', `Student group submitted a new Research Proposal: "${title}"`, 'info');
  await logAction(req, 'SUBMIT_PROPOSAL', `Student team submitted new Research Proposal Form: "${title}"`);

  res.status(201).json(research);
};

// Admin directly archives a manuscript into the repository (handleAddRepositoryPaper) —
// distinct from createResearch: no student submitter, no version record, status is
// set directly rather than starting the Submitted -> ... pipeline.
const createArchivedResearch = async (req, res, next) => {
  const { title, abstract, departmentId, courseId, schoolYearId, adviserId, keywords, status, proposalFiles } = req.body;
  if (!title || !abstract || !departmentId || !courseId || !schoolYearId || !adviserId) {
    return next(new AppError('title, abstract, departmentId, courseId, schoolYearId, and adviserId are required', 400));
  }

  const research = await Research.create({
    title, abstract, departmentId, courseId, schoolYearId, adviserId,
    keywords: keywords || [], studentIds: [], panelistIds: [],
    proposalFiles: Array.isArray(proposalFiles) ? proposalFiles : [],
    status: status || 'Archived', viewCount: 0, downloadCount: 0,
  });

  await logAction(req, 'ADD_REPOSITORY_MANUSCRIPT', `Super Admin archived new manuscript: "${research.title}"`);
  res.status(201).json(research);
};

// Generic metadata update (title/abstract/keywords/etc.)
const updateResearch = async (req, res, next) => {
  const research = await Research.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
  if (!research) return next(new AppError('Research not found', 404));
  await logAction(req, 'UPDATE_RESEARCH_METADATA', `Updated metadata for capstone: "${research.title}"`);
  res.json(research);
};

const deleteResearch = async (req, res, next) => {
  const research = await Research.findByIdAndDelete(req.params.id);
  if (!research) return next(new AppError('Research not found', 404));
  await logAction(req, 'DELETE_REPOSITORY_MANUSCRIPT', `Super Admin deleted manuscript of ID: ${req.params.id}`);
  res.status(204).send();
};

// Adviser approve/revision/reject (handleApproveManuscript)
const approveManuscript = async (req, res, next) => {
  const { decision, feedback } = req.body; // decision: true|'Approve' | 'Revision' | 'Reject'
  const research = await Research.findById(req.params.id);
  if (!research) return next(new AppError('Research not found', 404));

  const isApproved = decision === true || decision === 'Approve';
  const newStatus = isApproved ? 'Approved by Adviser' : 'Revision Required';

  research.status = newStatus;
  await research.save();

  await notifyMany(
    research.studentIds,
    isApproved ? 'Manuscript Vetted' : 'Revision Action Required',
    isApproved
      ? 'Your adviser approved your manuscript draft. Coordinator will lock defense date.'
      : 'Your adviser requested revisions on your chapters. Please check timelines.',
    isApproved ? 'success' : 'warning',
  );

  if (feedback) {
    const ResearchComment = require('../models/ResearchComment');
    await ResearchComment.create({
      researchId: research._id, versionId: undefined, authorId: req.user._id,
      authorName: req.user.name, authorRole: req.user.role, chapter: 'general', text: feedback,
    });
  }

  await logAction(req, isApproved ? 'APPROVE_MANUSCRIPT' : 'REQUEST_REVISIONS', `Research supervisor ${req.user.name} set status for ID ${research._id} to: ${newStatus}`);
  res.json(research);
};

// Coordinator Kanban board (handleUpdateResearchStatus)
const updateStatus = async (req, res, next) => {
  const { status } = req.body;
  if (!status) return next(new AppError('status is required', 400));
  const research = await Research.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
  if (!research) return next(new AppError('Research not found', 404));
  await logAction(req, 'UPDATE_RESEARCH_STATUS', `Coordinator updated research status of ID ${research._id} to ${status}`);
  res.json(research);
};

// Coordinator reassigns adviser (handleUpdateResearchAdviser)
const updateAdviser = async (req, res, next) => {
  const { adviserId } = req.body;
  if (!adviserId) return next(new AppError('adviserId is required', 400));
  const research = await Research.findByIdAndUpdate(req.params.id, { adviserId }, { returnDocument: 'after' });
  if (!research) return next(new AppError('Research not found', 404));
  await logAction(req, 'UPDATE_ADVISER', `Coordinator reassigned adviser ID ${adviserId} to research group ID ${research._id}`);
  res.json(research);
};

// Repository view/download counters (handleIncrementRepositoryCounts)
const incrementCounts = async (req, res, next) => {
  const { type } = req.body; // 'view' | 'download'
  const field = type === 'download' ? { downloadCount: 1 } : { viewCount: 1 };
  const research = await Research.findByIdAndUpdate(req.params.id, { $inc: field }, { returnDocument: 'after' });
  if (!research) return next(new AppError('Research not found', 404));
  res.json(research);
};

// Student attachments (handleUpdateProposalFiles)
const updateProposalFiles = async (req, res, next) => {
  const { proposalFiles } = req.body;
  const research = await Research.findByIdAndUpdate(req.params.id, { proposalFiles }, { returnDocument: 'after' });
  if (!research) return next(new AppError('Research not found', 404));
  await logAction(req, 'UPDATE_PROPOSAL_FILES', `Student updated proposal files/attachments list for Research ID: ${research._id}`);
  res.json(research);
};

module.exports = {
  listResearch, getResearch, createResearch, createArchivedResearch, updateResearch, deleteResearch,
  approveManuscript, updateStatus, updateAdviser, incrementCounts, updateProposalFiles,
};
