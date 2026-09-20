const express = require('express');
const {
  listResearch, getResearch, createResearch, createArchivedResearch, updateResearch, deleteResearch,
  approveManuscript, updateStatus, updateAdviser, incrementCounts, updateProposalFiles,
} = require('../controllers/researchController');
const { addVersion, listVersionsForResearch } = require('../controllers/versionController');
const { listCommentsForResearch, createComment } = require('../controllers/commentController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', listResearch);
router.post('/', requireRole('student'), createResearch);
router.post('/archived', requireRole('admin'), createArchivedResearch);
router.get('/:id', getResearch);
router.patch('/:id', updateResearch);
router.delete('/:id', requireRole('admin'), deleteResearch);

router.post('/:id/approve', requireRole('adviser', 'coordinator'), approveManuscript);
router.patch('/:id/status', requireRole('coordinator', 'admin'), updateStatus);
router.patch('/:id/adviser', requireRole('coordinator', 'admin'), updateAdviser);
router.post('/:id/increment', incrementCounts);
router.patch('/:id/proposal-files', requireRole('student'), updateProposalFiles);

router.get('/:id/versions', listVersionsForResearch);
router.post('/:id/versions', requireRole('student'), addVersion);
router.get('/:id/comments', listCommentsForResearch);
router.post('/:id/comments', createComment);

module.exports = router;
