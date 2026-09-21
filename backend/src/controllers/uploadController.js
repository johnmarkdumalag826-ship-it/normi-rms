const AppError = require('../utils/AppError');
const UploadedFile = require('../models/UploadedFile');

// Generic file upload: the client uploads once here, gets back a real fileUrl/fileName/size,
// then references that in whichever resource it's attaching to (proposal files, manuscript
// versions, annotated adviser feedback files). Replaces the frontend's addSimulatedFile().
const uploadFile = async (req, res, next) => {
  if (!req.file) return next(new AppError('No file uploaded, or file type not allowed (.pdf, .doc, .docx only)', 400));
  await UploadedFile.create({
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    uploadedBy: req.user._id,
  });
  res.status(201).json({
    fileName: req.file.originalname,
    url: `uploads/${req.file.filename}`,
    size: req.file.size,
  });
};

module.exports = { uploadFile };
