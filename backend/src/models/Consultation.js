const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  adviserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dateTime: { type: Date, required: true },
  topic: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'completed', 'cancelled'], default: 'pending' },
  meetLink: String,
}, { timestamps: true });

module.exports = mongoose.model('Consultation', consultationSchema);
