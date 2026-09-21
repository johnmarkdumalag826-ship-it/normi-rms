const ResearchComment = require('../models/ResearchComment');
const Research = require('../models/Research');
const ResearchVersion = require('../models/ResearchVersion');
const AppError = require('../utils/AppError');

const num = (v) => typeof v === 'number' && Number.isFinite(v);

// A comment can point at highlighted text. Two shapes, checked here so odd data never gets stored:
//   PDF:  { kind: 'pdf',  page, rects: [{ x, y, w, h }], quote }   (rectangles as fractions of the page, 0 to 1)
//   Word: { kind: 'docx', start, end, quote }                       (character positions in the text)
const cleanAnchor = (a) => {
  if (a === undefined || a === null) return undefined;
  if (typeof a !== 'object') return null;
  const quote = String(a.quote || '').slice(0, 1000);
  if (a.kind === 'pdf') {
    if (!Number.isInteger(a.page) || a.page < 1 || !Array.isArray(a.rects) || a.rects.length === 0 || a.rects.length > 100) return null;
    const rects = a.rects.map((r) => ({ x: r?.x, y: r?.y, w: r?.w, h: r?.h }));
    if (!rects.every((r) => num(r.x) && num(r.y) && num(r.w) && num(r.h) && r.x >= -0.01 && r.y >= -0.01 && r.w >= 0 && r.h >= 0 && r.w <= 1.01 && r.h <= 1.01)) return null;
    return { kind: 'pdf', page: a.page, rects, quote };
  }
  if (a.kind === 'docx') {
    if (!Number.isInteger(a.start) || !Number.isInteger(a.end) || a.start < 0 || a.end <= a.start) return null;
    return { kind: 'docx', start: a.start, end: a.end, quote };
  }
  return null;
};

const listCommentsForResearch = async (req, res) => {
  const comments = await ResearchComment.find({ researchId: req.params.id }).sort({ commentAt: -1 });
  res.json(comments);
};

const listAllComments = async (req, res) => {
  const filter = {};
  if (req.query.researchId) filter.researchId = req.query.researchId;
  res.json(await ResearchComment.find(filter).sort({ commentAt: -1 }));
};

const createComment = async (req, res, next) => {
  const { versionId, chapter, text, anchor } = req.body;
  if (!text || !String(text).trim()) return next(new AppError('text is required', 400));

  const research = await Research.findById(req.params.id);
  if (!research) return next(new AppError('Research not found', 404));

  // Only people connected to this paper may comment on it.
  const me = String(req.user._id);
  const connected = ['admin', 'coordinator'].includes(req.user.role)
    || String(research.adviserId) === me
    || (research.studentIds || []).some((id) => String(id) === me)
    || (research.panelistIds || []).some((id) => String(id) === me);
  if (!connected) return next(new AppError('You cannot comment on this paper', 403));

  const safeAnchor = cleanAnchor(anchor);
  if (safeAnchor === null) return next(new AppError('The highlighted text is not valid', 400));
  if (versionId && !(await ResearchVersion.exists({ _id: versionId, researchId: research._id }))) {
    return next(new AppError('That version does not belong to this paper', 400));
  }

  const comment = await ResearchComment.create({
    researchId: research._id, versionId, chapter: chapter || 'general', text: String(text).trim(), anchor: safeAnchor,
    authorId: req.user._id, authorName: req.user.name, authorRole: req.user.role,
  });
  res.status(201).json(comment);
};

const resolveComment = async (req, res, next) => {
  const comment = await ResearchComment.findByIdAndUpdate(
    req.params.id,
    { resolved: true, resolvedBy: req.user._id },
    { returnDocument: 'after' },
  );
  if (!comment) return next(new AppError('Comment not found', 404));
  res.json(comment);
};

module.exports = { listCommentsForResearch, listAllComments, createComment, resolveComment };
