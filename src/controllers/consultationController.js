const Consultation = require('../models/Consultation');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/audit');

const listConsultations = async (req, res) => {
  const filter = {};
  if (req.query.adviserId) filter.adviserId = req.query.adviserId;
  if (req.query.studentId) filter.studentId = req.query.studentId;
  res.json(await Consultation.find(filter).sort({ dateTime: -1 }));
};

const createConsultation = async (req, res) => {
  const consultation = await Consultation.create(req.body);
  await logAction(req, 'ADD_CONSULTATION', `Supervisor scheduled consultation slot: "${consultation.topic}"`);
  res.status(201).json(consultation);
};

// Generic update, plus the approve shortcut (handleApproveConsultation)
const updateConsultation = async (req, res, next) => {
  const update = { ...req.body };
  if (update.status === 'approved' && !update.meetLink) {
    update.meetLink = 'https://meet.google.com/normi-abc-xyz';
  }
  const consultation = await Consultation.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' });
  if (!consultation) return next(new AppError('Consultation not found', 404));
  res.json(consultation);
};

module.exports = { listConsultations, createConsultation, updateConsultation };
