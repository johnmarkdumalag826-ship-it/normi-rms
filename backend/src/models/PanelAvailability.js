const mongoose = require('mongoose');

const panelAvailabilitySchema = new mongoose.Schema({
  panelistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true,
  },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('PanelAvailability', panelAvailabilitySchema);
