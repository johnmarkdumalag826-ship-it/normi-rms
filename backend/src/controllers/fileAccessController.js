const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Research = require('../models/Research');
const ResearchVersion = require('../models/ResearchVersion');
const Schedule = require('../models/Schedule');
const UploadedFile = require('../models/UploadedFile');
const AppError = require('../utils/AppError');

// Uploaded files are NOT public. To open one, the website first asks
//   POST /api/uploads/access   (needs sign-in)
// and, only if the person may see that file, gets a short link that works for one file
// for a few minutes. The file itself is then served by  GET /uploads/:filename?ft=...
//
// Who may open a file:
//   Admin ............... every file
//   Coordinator ......... every paper file and version
//   Adviser ............. the papers and versions of their own student groups
//   Student ............. their own group's files, their own uploads, and PUBLISHED papers
//   Panel Member ........ defense copies of papers they are scheduled for, and PUBLISHED papers
//   Anyone signed in .... the main file of a PUBLISHED paper (status Completed or Archived)

const UPLOAD_DIR = path.resolve('uploads');
const LINK_MINUTES = 10;
const PUBLISHED = ['Completed', 'Archived'];

// Links use their own signing key, so a login token can never open a file and vice versa.
const linkSecret = () => `${process.env.JWT_SECRET}:file-link`;

// Only plain file names are allowed: no folders, no "..", nothing surprising.
const safeName = (value) => {
  const base = path.basename(String(value || '').split('?')[0].split('#')[0]);
  return /^[A-Za-z0-9._-]+$/.test(base) ? base : null;
};

// A name to show when the file is downloaded (letters, numbers, spaces and a few symbols only).
const cleanDisplayName = (value, fallback) => {
  const cleaned = String(value || '').replace(/[^\w .()\-]/g, '').trim().slice(0, 120);
  return cleaned || fallback;
};

async function canAccess(user, filename) {
  if (user.role === 'admin') return true;

  // The person who uploaded a file can always open it.
  if (await UploadedFile.exists({ filename, uploadedBy: user._id })) return true;

  const uid = String(user._id);
  // The stored address ends with the file name (it may be "uploads/x.pdf" or a full web address).
  const endsWithName = new RegExp(`(^|/)${filename.replace(/\./g, '\\.')}$`);
  const isMember = (paper) =>
    String(paper.adviserId) === uid || (paper.studentIds || []).some((s) => String(s) === uid);
  const isOnPanel = async (paperId) => !!(await Schedule.exists({ researchId: paperId, panelistIds: user._id }));

  // 1) A file listed on the paper itself (the main document, summary, attachments)
  const papers = await Research.find({ 'proposalFiles.url': endsWithName }).select('status adviserId studentIds');
  for (const paper of papers) {
    if (PUBLISHED.includes(paper.status)) return true;
    if (user.role === 'coordinator' || isMember(paper)) return true;
    if (user.role === 'panelist' && (await isOnPanel(paper._id))) return true;
  }

  // 2) A file sent as a version (a draft for the adviser, or a defense copy for the panel)
  const versions = await ResearchVersion.find({ fileUrl: endsWithName }).select('researchId type');
  for (const version of versions) {
    const paper = await Research.findById(version.researchId).select('status adviserId studentIds');
    if (!paper) continue;
    if (user.role === 'coordinator' || isMember(paper)) return true;
    if (user.role === 'panelist' && version.type === 'defense_manuscript' && (await isOnPanel(paper._id))) return true;
  }

  return false;
}

// POST /api/uploads/access   body: { file, mode?: 'view' | 'download', name? }
const requestAccess = async (req, res, next) => {
  const filename = safeName(req.body && req.body.file);
  if (!filename) return next(new AppError('That file address is not valid', 400));
  if (!fs.existsSync(path.join(UPLOAD_DIR, filename))) return next(new AppError('That file could not be found', 404));
  if (!(await canAccess(req.user, filename))) {
    return next(new AppError('You do not have permission to open this file', 403));
  }

  const mode = req.body.mode === 'download' ? 'download' : 'view';
  const name = cleanDisplayName(req.body.name, filename);
  const token = jwt.sign({ typ: 'file', file: filename, mode, name }, linkSecret(), { expiresIn: `${LINK_MINUTES}m` });
  res.json({ path: `/uploads/${filename}?ft=${encodeURIComponent(token)}`, expiresInMinutes: LINK_MINUTES });
};

// GET /uploads/:filename?ft=...   (the link from requestAccess)
const serveFile = (req, res, next) => {
  const filename = safeName(req.params.filename);
  if (!filename || filename !== req.params.filename) return next(new AppError('File not found', 404));

  let claims;
  try {
    claims = jwt.verify(String(req.query.ft || ''), linkSecret());
  } catch {
    return next(new AppError('This file link is missing or has expired. Please open the file again from the website.', 401));
  }
  if (claims.typ !== 'file' || claims.file !== filename) {
    return next(new AppError('You do not have permission to open this file', 403));
  }

  const absolute = path.join(UPLOAD_DIR, filename);
  if (!absolute.startsWith(UPLOAD_DIR + path.sep) || !fs.existsSync(absolute)) {
    return next(new AppError('File not found', 404));
  }

  res.set({
    'Content-Disposition': claims.mode === 'download'
      ? `attachment; filename*=UTF-8''${encodeURIComponent(claims.name)}`
      : 'inline',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.sendFile(absolute, { dotfiles: 'deny' });
};

module.exports = { requestAccess, serveFile, canAccess };
