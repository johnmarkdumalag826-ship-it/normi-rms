const Department = require('../models/Department');

const listDepartments = async (req, res) => {
  res.json(await Department.find().sort({ name: 1 }));
};

const createDepartment = async (req, res) => {
  const dept = await Department.create(req.body);
  res.status(201).json(dept);
};

module.exports = { listDepartments, createDepartment };
