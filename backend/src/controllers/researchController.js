const path = require('path');
const Research = require('../models/Research');
const ResearchVersion = require('../models/ResearchVersion');
const Department = require('../models/Department');
const Course = require('../models/Course');
const SchoolYear = require('../models/SchoolYear');
const UploadedFile = require('../models/UploadedFile');
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

const cleanMembers = (members) => (Array.isArray(members) ? members : [])
  .map((m) => String(m).trim().slice(0, 100))
  .filter(Boolean)
  .slice(0, 20);

const isGroupMember = (research, user) => research.studentIds.some((id) => String(id) === String(user._id));

// Every file a student attaches must be one they uploaded themselves: files are opened by name,
// so attaching someone else's upload would hand the group a file it should not see.
const allUploadedBy = async (user, files) => {
  for (const f of files) {
    const filename = path.basename(String(f.url || '').split('?')[0]);
    if (!filename || !(await UploadedFile.exists({ filename, uploadedBy: user._id }))) return false;
  }
  return true;
};

// Version 1's file is the real, already-uploaded main document, never a fabricated path built
// from just a name (that file would never exist on the server).
const createFirstVersion = (research, user, fileName) => {
  const mainDoc = (research.proposalFiles || []).find((f) => f.category === 'proposal_document');
  return ResearchVersion.create({
    researchId: research._id, versionNumber: 1, title: research.title, abstract: research.abstract,
    fileUrl: mainDoc?.url, fileName: mainDoc?.name || fileName,
    submittedBy: user._id, chapters: blankChapters(),
  });
};

// A student starts by registering their group: a group name, an adviser and the names of the
// other members. The title, summary and main document come later as the title proposal (see
// submitTitleProposal). A title and summary sent along with the group skip that later step.
const createResearch = async (req, res, next) => {
  const { groupName, title, abstract, keywords, adviserId, fileName, proposalFiles, members } = req.body;
  const withProposal = !!(title && abstract);
  if (!adviserId) return next(new AppError('Please choose your adviser.', 400));
  if (!withProposal && !String(groupName || '').trim()) {
    return next(new AppError('Please type your group name.', 400));
  }

  const user = req.user;
  const departmentId = user.departmentId || (await Department.findOne().sort({ name: 1 }))?._id;
  const courseId = user.courseId || (await Course.findOne().sort({ name: 1 }))?._id;
  const currentYear = await SchoolYear.findOne({ isCurrent: true }) || (await SchoolYear.findOne().sort({ name: -1 }));

  const research = await Research.create({
    groupName: String(groupName || '').trim().slice(0, 100) || undefined,
    title: withProposal ? title : '', abstract: withProposal ? abstract : '', keywords: keywords || [],
    departmentId, courseId, schoolYearId: currentYear?._id,
    studentIds: [user._id], memberNames: cleanMembers(members), adviserId, panelistIds: [],
    status: withProposal ? 'Submitted' : 'Group Registered', viewCount: 0, downloadCount: 0,
    proposalFiles: withProposal ? proposalFiles || [] : [],
  });

  if (withProposal) {
    await createFirstVersion(research, user, fileName);
    await notify(adviserId, 'New Research Title Proposal', `Student group submitted a new Research Proposal: "${title}"`, 'info');
    await logAction(req, 'SUBMIT_PROPOSAL', `Student team submitted new Research Proposal Form: "${title}"`);
  } else {
    await notify(adviserId, 'New Student Group', `${user.name} registered the group "${research.groupName}" with you as adviser.`, 'info');
    await logAction(req, 'REGISTER_GROUP', `Student registered research group "${research.groupName}"`);
  }

  res.status(201).json(research);
};

// The group sends its title, summary, keywords and main document. This is the first time the
// adviser gets something to read, so the paper becomes "Submitted" and Version 1 is made.
const submitTitleProposal = async (req, res, next) => {
  const { title, abstract, keywords, proposalFiles } = req.body;
  const research = await Research.findById(req.params.id);
  if (!research) return next(new AppError('Research not found', 404));
  if (!isGroupMember(research, req.user)) return next(new AppError('Only the students in this group can send its title proposal', 403));
  if (research.status !== 'Group Registered') {
    return next(new AppError('Your title proposal was already sent. Upload a new version from My Research instead.', 409));
  }
  if (!String(title || '').trim() || !String(abstract || '').trim()) {
    return next(new AppError('Please write your research title and a short summary.', 400));
  }
  const files = (Array.isArray(proposalFiles) ? proposalFiles : []).filter((f) => f.category !== 'title_list');
  const mainDoc = files.find((f) => f.category === 'proposal_document');
  if (!mainDoc) return next(new AppError('Please add your main document (PDF or Word).', 400));
  if (!(await allUploadedBy(req.user, files))) return next(new AppError('Those files were not uploaded by you', 400));

  research.title = String(title).trim();
  research.abstract = String(abstract).trim();
  research.keywords = (Array.isArray(keywords) ? keywords : []).map((k) => String(k).trim()).filter(Boolean);
  research.proposalFiles = [...research.proposalFiles.filter((f) => f.category === 'title_list'), ...files];
  research.status = 'Submitted';
  await research.save();
  await createFirstVersion(research, req.user, mainDoc.name);

  await notify(research.adviserId, 'New Research Title Proposal', `Student group submitted a new Research Proposal: "${research.title}"`, 'info');
  await logAction(req, 'SUBMIT_PROPOSAL', `Student team submitted new Research Proposal Form: "${research.title}"`);
  res.json(research);
};

// The adviser checks the file with the group's prepared titles: approves it, or asks for changes
// with a note. Only this group's own adviser can decide.
const reviewTitleList = async (req, res, next) => {
  const { decision, feedback } = req.body;
  const research = await Research.findById(req.params.id);
  if (!research) return next(new AppError('Research not found', 404));
  if (String(research.adviserId) !== String(req.user._id)) {
    return next(new AppError("Only this group's adviser can check its titles", 403));
  }
  if (!research.proposalFiles.some((f) => f.category === 'title_list')) {
    return next(new AppError('This group has not sent its prepared titles yet.', 409));
  }
  const approved = decision === 'Approve';
  if (!approved && decision !== 'Revision') return next(new AppError('Please choose Approve or Ask for changes.', 400));
  const note = String(feedback || '').trim().slice(0, 1000);
  if (!approved && !note) return next(new AppError('Please tell the students what to change.', 400));

  research.titleReview = { status: approved ? 'Approved' : 'Revision Required', feedback: note, reviewedAt: new Date() };
  await research.save();

  await notifyMany(
    research.studentIds,
    approved ? 'Titles Approved' : 'Titles Need Changes',
    approved
      ? 'Your adviser approved the titles your group prepared for the title hearing.'
      : `Your adviser asked for changes to your prepared titles: ${note}`,
    approved ? 'success' : 'warning',
  );
  await logAction(req, 'REVIEW_TITLE_LIST', `Adviser ${approved ? 'approved' : 'asked for changes to'} the prepared titles of research ID ${research._id}`);
  res.json(research);
};

// The group sends one file with the titles it prepared for the title hearing. Sending again
// replaces the earlier file. The adviser, the coordinator and the hearing's panel can open it.
const sendTitleList = async (req, res, next) => {
  const { name, url, size } = req.body;
  const research = await Research.findById(req.params.id);
  if (!research) return next(new AppError('Research not found', 404));
  if (!isGroupMember(research, req.user)) return next(new AppError('Only the students in this group can send its titles', 403));
  if (!name || !url) return next(new AppError('Please choose a file first.', 400));
  if (!(await allUploadedBy(req.user, [{ url }]))) return next(new AppError('That file was not uploaded by you', 400));

  research.proposalFiles = [
    ...research.proposalFiles.filter((f) => f.category !== 'title_list'),
    { name: String(name).slice(0, 200), url: String(url), size: Number(size) || 0, category: 'title_list', uploadedAt: new Date() },
  ];
  research.titleReview = { status: 'Pending' }; // a new file needs the adviser's check again
  await research.save();

  await notify(research.adviserId, 'Titles Sent for the Hearing', `${req.user.name}'s group sent the file with their prepared titles: ${name}`, 'info');
  await logAction(req, 'SEND_TITLE_LIST', `Student group sent its prepared titles file for the title hearing: ${name}`);
  res.json(research);
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
  if (research.status === 'Group Registered') {
    return next(new AppError('This group has not sent its title proposal yet, so there is nothing to approve.', 409));
  }

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
  listResearch, getResearch, createResearch, submitTitleProposal, sendTitleList, reviewTitleList, createArchivedResearch, updateResearch, deleteResearch,
  approveManuscript, updateStatus, updateAdviser, incrementCounts, updateProposalFiles,
};
