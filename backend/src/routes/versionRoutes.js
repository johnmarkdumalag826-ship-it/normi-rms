const express = require('express');
const { updateChapterStatus, annotateVersion, listAllVersions } = require('../controllers/versionController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listAllVersions);
router.patch('/:versionId/chapters/:chapter', protect, requireRole('adviser'), updateChapterStatus);
router.patch('/:versionId/annotate', protect, requireRole('adviser'), annotateVersion);

module.exports = router;
