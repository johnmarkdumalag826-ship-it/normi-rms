const mongoose = require('mongoose');

// One record for every file that is uploaded, so we always know who uploaded it.
// The uploader can always open their own file (for example a draft they have not attached yet).
const uploadedFileSchema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true }, // the name on disk, e.g. 1789926689264-709116410.pdf
  originalName: String,                                     // the name the person gave it
  size: Number,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('UploadedFile', uploadedFileSchema);
