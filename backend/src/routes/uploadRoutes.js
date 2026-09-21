const express = require('express');
const { uploadFile } = require('../controllers/uploadController');
const { requestAccess } = require('../controllers/fileAccessController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', protect, upload.single('file'), uploadFile);

// Ask for a short link to open one file. Only people allowed to see that file get one.
router.post('/access', protect, requestAccess);

module.exports = router;
