const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  researchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Research', required: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  panelistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  conflictsDetected: [String],
  type: { type: String, enum: ['proposal', 'final'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
