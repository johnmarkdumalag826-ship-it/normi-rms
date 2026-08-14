const ResearchVersion = require('../models/ResearchVersion');
const Research = require('../models/Research');
const ResearchComment = require('../models/ResearchComment');
const Schedule = require('../models/Schedule');
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

// Student upload revision / defense manuscript (handleStudentUploadRevision)
const addVersion = async (req, res, next) => {
  const researchId = req.params.id;
  const { title, abstract, fileName, fileUrl, type } = req.body;
  const research = await Research.findById(researchId);
  if (!research) return next(new AppError('Research not found', 404));

  const versionCount = await ResearchVersion.countDocuments({ researchId });
  const versionType = type || 'adviser_check';

  const version = await ResearchVersion.create({
    researchId, versionNumber: versionCount + 1, title: title || research.title, abstract: abstract || research.abstract,
    fileUrl, fileName,
    submittedBy: req.user._id, type: versionType, chapters: blankChapters(),
  });

  research.title = title || research.title;
  research.abstract = abstract || research.abstract;
  if (versionType === 'adviser_check') research.status = 'Submitted';
  await research.save();

  if (versionType === 'defense_manuscript') {
    const sched = await Schedule.findOne({ researchId });
    if (sched && sched.panelistIds.length) {
      await notifyMany(sched.panelistIds, 'Defense Manuscript Submitted', `Student group submitted presentation manuscript for your reception & evaluation: ${fileName}`, 'info');
    }
    await logAction(req, 'UPLOAD_REVISION', `Student uploaded Version ${version.versionNumber} defense manuscript for panel reception: ${fileName}`);
  } else {
    await notify(research.adviserId, 'New Manuscript Upload', `Your student group submitted Version ${version.versionNumber} Draft: ${fileName}`, 'info');
    await logAction(req, 'UPLOAD_REVISION', `Student uploaded Version ${version.versionNumber} draft proposal for adviser checking: ${fileName}`);
  }

  res.status(201).json(version);
};

// Adviser marks a chapter status (handleUpdateChapterStatus)
const updateChapterStatus = async (req, res, next) => {
  const { versionId, chapter } = req.params;
  const { status, feedback } = req.body;
  const validChapters = ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5'];
  if (!validChapters.includes(chapter)) return next(new AppError('Invalid chapter', 400));

  const version = await ResearchVersion.findById(versionId);
  if (!version) return next(new AppError('Version not found', 404));

  version.chapters[chapter] = { status, feedback, lastUpdated: new Date() };
  await version.save();

  const research = await Research.findById(version.researchId);
  if (research) {
    if (status === 'Revision Required') {
      research.status = 'Revision Required';
      await research.save();
      await ResearchComment.create({
        researchId: research._id, versionId: version._id, authorId: req.user._id,
        authorName: req.user.name, authorRole: 'adviser', chapter, text: feedback,
      });
    }
    await notifyMany(research.studentIds, 'Chapter Status Updated', `${req.user.name} updated ${chapter.toUpperCase()} to: ${status}`, status === 'Approved' ? 'success' : 'warning');
  }

  await logAction(req, 'UPDATE_CHAPTER_STATUS', `Supervisor ${req.user.name} marked ${chapter.toUpperCase()} as ${status}.`);
  res.json(version);
};

const listVersionsForResearch = async (req, res) => {
  const versions = await ResearchVersion.find({ researchId: req.params.id }).sort({ versionNumber: -1 });
  res.json(versions);
};

// Full roster, matching how the frontend currently holds one combined `versions`
// array across every research group (not just the one currently open).
const listAllVersions = async (req, res) => {
  const filter = {};
  if (req.query.researchId) filter.researchId = req.query.researchId;
  res.json(await ResearchVersion.find(filter).sort({ versionNumber: -1 }));
};

// Adviser attaches a marked-up annotation file (fileUrl/fileName come from POST /api/uploads)
const annotateVersion = async (req, res, next) => {
  const { annotatedFileUrl, annotatedFileName } = req.body;
  const version = await ResearchVersion.findByIdAndUpdate(
    req.params.versionId,
    { annotatedFileUrl, annotatedFileName },
    { returnDocument: 'after' },
  );
  if (!version) return next(new AppError('Version not found', 404));
  res.json(version);
};

module.exports = { addVersion, updateChapterStatus, listVersionsForResearch, listAllVersions, annotateVersion };
