const DefenseType = require('../models/DefenseType');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/audit');

const listDefenseTypes = async (req, res) => {
  res.json(await DefenseType.find().sort({ name: 1 }));
};

const createDefenseType = async (req, res, next) => {
  const { name } = req.body;
  if (!name) return next(new AppError('name is required', 400));
  const existing = await DefenseType.findOne({ name });
  if (existing) return res.status(200).json(existing);

  const type = await DefenseType.create({ name });
  await logAction(req, 'ADD_DEFENSE_TYPE', `Institutional defense type category configured: "${name}"`);
  res.status(201).json(type);
};

const deleteDefenseType = async (req, res, next) => {
  const type = await DefenseType.findByIdAndDelete(req.params.id);
  if (!type) return next(new AppError('Defense type not found', 404));
  await logAction(req, 'DELETE_DEFENSE_TYPE', `Removed institutional defense type category: "${type.name}"`);
  res.status(204).send();
};

module.exports = { listDefenseTypes, createDefenseType, deleteDefenseType };
