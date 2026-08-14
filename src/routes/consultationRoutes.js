const express = require('express');
const { listConsultations, createConsultation, updateConsultation } = require('../controllers/consultationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', listConsultations);
router.post('/', createConsultation);
router.patch('/:id', updateConsultation);

module.exports = router;
