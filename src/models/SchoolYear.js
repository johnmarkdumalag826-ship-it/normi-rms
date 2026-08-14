const mongoose = require('mongoose');

const schoolYearSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  isCurrent: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('SchoolYear', schoolYearSchema);
