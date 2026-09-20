// Adds the school's reference data: departments, courses, school years and rooms.
// It does NOT create any user accounts. Use `npm run create-admin` for the first Admin.
// Usage: node scripts/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

const Department = require('../src/models/Department');
const Course = require('../src/models/Course');
const SchoolYear = require('../src/models/SchoolYear');
const Room = require('../src/models/Room');

async function upsertDepartment(name, code) {
  return Department.findOneAndUpdate({ code }, { name, code }, { upsert: true, returnDocument: 'after' });
}

async function upsertCourse(departmentId, name, code) {
  return Course.findOneAndUpdate({ code, departmentId }, { departmentId, name, code }, { upsert: true, returnDocument: 'after' });
}

async function main() {
  await connectDB();

  console.log('Removing stale departments/courses no longer part of the real curriculum...');
  const staleDeptCodes = ['CBE', 'CTE', 'CAS'];
  const staleDepts = await Department.find({ code: { $in: staleDeptCodes } });
  await Course.deleteMany({ departmentId: { $in: staleDepts.map(d => d._id) } });
  await Department.deleteMany({ code: { $in: staleDeptCodes } });
  await Course.deleteMany({ code: 'BSCS' });

  console.log('Seeding departments...');
  const cit = await upsertDepartment('College of Information Technology', 'CIT');
  const ccje = await upsertDepartment('College of Criminal Justice Education', 'CCJE');
  const chm = await upsertDepartment('College of Hospitality Management', 'CHM');
  const ceas = await upsertDepartment('College of Education, Arts and Science', 'CEAS');
  const cba = await upsertDepartment('College of Business Administration', 'CBA');

  console.log('Seeding courses...');
  const bsit = await upsertCourse(cit._id, 'Bachelor of Science in Information Technology', 'BSIT');
  await upsertCourse(ccje._id, 'Bachelor of Science in Criminology', 'BSC');
  await upsertCourse(chm._id, 'Bachelor of Science in Hospitality Management', 'BSHM');
  await upsertCourse(ceas._id, 'Bachelor of Elementary Education', 'BEED');
  await upsertCourse(ceas._id, 'Bachelor of Secondary Education major in Filipino', 'BSED-FIL');
  await upsertCourse(ceas._id, 'Bachelor of Secondary Education major in English', 'BSED-ENG');
  await upsertCourse(ceas._id, 'Bachelor of Secondary Education major in Mathematics', 'BSED-MATH');
  await upsertCourse(cba._id, 'Bachelor of Science in Business Administration major in Marketing Management', 'BSBA-MM');
  await upsertCourse(cba._id, 'Bachelor of Science in Business Administration major in Financial Management', 'BSBA-FM');

  console.log('Seeding school years...');
  await SchoolYear.updateMany({}, { isCurrent: false });
  await SchoolYear.findOneAndUpdate({ name: 'A.Y. 2024-2025' }, { name: 'A.Y. 2024-2025', isCurrent: false }, { upsert: true });
  await SchoolYear.findOneAndUpdate({ name: 'A.Y. 2025-2026' }, { name: 'A.Y. 2025-2026', isCurrent: true }, { upsert: true });

  console.log('Seeding rooms...');
  const rooms = [
    ['IT Laboratory 1', 'Building A, 2nd Floor', 40],
    ['IT Laboratory 2', 'Building A, 2nd Floor', 40],
    ['Audio-Visual Room (AVR)', 'Building B, Ground Floor', 80],
    ["Dean's Conference Room", 'Building A, 3rd Floor', 20],
    ['Library Discussion Room 1', 'Main Library, 2nd Floor', 15],
  ];
  for (const [name, location, capacity] of rooms) {
    await Room.findOneAndUpdate({ name }, { name, location, capacity }, { upsert: true });
  }

  console.log('\nSeed complete.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
