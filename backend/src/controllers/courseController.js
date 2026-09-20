const Course = require('../models/Course');

const listCourses = async (req, res) => {
  const filter = {};
  if (req.query.departmentId) filter.departmentId = req.query.departmentId;
  res.json(await Course.find(filter).sort({ name: 1 }));
};

const createCourse = async (req, res) => {
  const course = await Course.create(req.body);
  res.status(201).json(course);
};

module.exports = { listCourses, createCourse };
