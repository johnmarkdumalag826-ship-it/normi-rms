const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  researchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Research' },
  // A title hearing can be for one student who has not added any research yet. Every other kind of
  // defense needs a research paper.
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  panelistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  conflictsDetected: [String],
  type: { type: String, enum: ['title_hearing', 'proposal', 'final'], required: true },
}, { timestamps: true });

scheduleSchema.pre('validate', function () {
  const forStudentAlone = this.type === 'title_hearing' && !this.researchId && this.studentId;
  if (!this.researchId && !forStudentAlone) {
    this.invalidate('researchId', 'A defense needs a research paper; only a title hearing can be for a student alone.');
  }
});

module.exports = mongoose.model('Schedule', scheduleSchema);
