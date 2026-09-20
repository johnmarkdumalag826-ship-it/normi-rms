const SchoolYear = require('../models/SchoolYear');

const listSchoolYears = async (req, res) => {
  res.json(await SchoolYear.find().sort({ name: -1 }));
};

const createSchoolYear = async (req, res) => {
  if (req.body.isCurrent) {
    await SchoolYear.updateMany({}, { isCurrent: false });
  }
  const year = await SchoolYear.create(req.body);
  res.status(201).json(year);
};

module.exports = { listSchoolYears, createSchoolYear };
