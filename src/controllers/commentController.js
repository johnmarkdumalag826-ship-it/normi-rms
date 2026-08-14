const ResearchComment = require('../models/ResearchComment');
const AppError = require('../utils/AppError');

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
  const { versionId, chapter, text } = req.body;
  if (!text) return next(new AppError('text is required', 400));

  const comment = await ResearchComment.create({
    researchId: req.params.id, versionId, chapter: chapter || 'general', text,
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
