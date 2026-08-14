const express = require('express');
const { listAllComments, resolveComment } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listAllComments);
router.patch('/:id', protect, resolveComment);

module.exports = router;
