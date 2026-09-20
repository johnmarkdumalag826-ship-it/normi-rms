const express = require('express');
const { createEvaluation, listEvaluationsForSchedule, listAllEvaluations } = require('../controllers/evaluationController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', listAllEvaluations);
router.post('/', requireRole('panelist'), createEvaluation);
router.get('/schedule/:scheduleId', listEvaluationsForSchedule);

module.exports = router;
