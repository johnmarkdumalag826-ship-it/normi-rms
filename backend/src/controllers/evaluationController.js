const Evaluation = require('../models/Evaluation');
const Schedule = require('../models/Schedule');
const Research = require('../models/Research');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/audit');
const { notifyMany } = require('../utils/notify');

// Panelist submits a grade sheet (handleAddEvaluation)
const createEvaluation = async (req, res, next) => {
  const { scheduleId, score1, score2, score3, score4, comment, recommendation } = req.body;
  if (!scheduleId || !recommendation) return next(new AppError('scheduleId and recommendation are required', 400));

  const totalScore = [score1, score2, score3, score4].reduce((sum, s) => sum + (Number(s) || 0), 0);

  const evaluation = await Evaluation.create({
    scheduleId, panelistId: req.user._id, panelistName: req.user.name,
    score1, score2, score3, score4, totalScore, comment, recommendation,
  });

  const schedule = await Schedule.findByIdAndUpdate(scheduleId, { status: 'completed' }, { returnDocument: 'after' });
  if (schedule) {
    const research = await Research.findByIdAndUpdate(
      schedule.researchId,
      { status: recommendation === 'Passed' ? 'Completed' : 'Revision Required' },
      { returnDocument: 'after' },
    );
    if (research) {
      await notifyMany(
        research.studentIds,
        'Jury Recommendation Published',
        `Panelist evaluated defense with recommendation: ${recommendation} (Score: ${totalScore}/100)`,
        recommendation === 'Failed' ? 'error' : 'success',
      );
    }
  }

  await logAction(req, 'LOCK_EVALUATION', `Jury member ${req.user.name} submitted grade evaluation out of 100: ${totalScore}`);
  res.status(201).json(evaluation);
};

const listEvaluationsForSchedule = async (req, res) => {
  res.json(await Evaluation.find({ scheduleId: req.params.scheduleId }));
};

const listAllEvaluations = async (req, res) => {
  const filter = {};
  if (req.query.scheduleId) filter.scheduleId = req.query.scheduleId;
  if (req.query.panelistId) filter.panelistId = req.query.panelistId;
  res.json(await Evaluation.find(filter));
};

module.exports = { createEvaluation, listEvaluationsForSchedule, listAllEvaluations };
