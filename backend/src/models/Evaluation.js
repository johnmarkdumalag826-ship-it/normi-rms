const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
  panelistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  panelistName: { type: String, required: true },
  score1: { type: Number, required: true, min: 0, max: 20 },
  score2: { type: Number, required: true, min: 0, max: 30 },
  score3: { type: Number, required: true, min: 0, max: 30 },
  score4: { type: Number, required: true, min: 0, max: 20 },
  totalScore: { type: Number, required: true, min: 0, max: 100 },
  comment: String,
  recommendation: { type: String, enum: ['Passed', 'Minor Revision', 'Major Revision', 'Failed'], required: true },
}, { timestamps: { createdAt: 'evaluatedAt', updatedAt: false } });

module.exports = mongoose.model('Evaluation', evaluationSchema);
