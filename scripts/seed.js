// One-time database seed, replacing Frontend/src/db/mockData.ts as the source of demo data
// (see NORMI RMS roadmap Phase 6). Safe to re-run: every write is an upsert.
// Usage: node scripts/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

const Department = require('../src/models/Department');
const Course = require('../src/models/Course');
const SchoolYear = require('../src/models/SchoolYear');
const Room = require('../src/models/Room');
const User = require('../src/models/User');

async function upsertDepartment(name, code) {
  return Department.findOneAndUpdate({ code }, { name, code }, { upsert: true, returnDocument: 'after' });
}

async function upsertCourse(departmentId, name, code) {
  return Course.findOneAndUpdate({ code, departmentId }, { departmentId, name, code }, { upsert: true, returnDocument: 'after' });
}

async function upsertUser({ email, password, name, role, departmentId, courseId, phone, avatar }) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`  skip (already exists): ${email}`);
    return existing;
  }
  const user = await User.create({ email, password, name, role, departmentId, courseId, phone, avatar, status: 'active' });
  console.log(`  created: ${email} (${role})`);
  return user;
}

async function main() {
  await connectDB();

  console.log('Seeding departments...');
  const cit = await upsertDepartment('College of Information Technology', 'CIT');
  await upsertDepartment('College of Business Education', 'CBE');
  await upsertDepartment('College of Teacher Education', 'CTE');
  await upsertDepartment('College of Arts and Sciences', 'CAS');

  console.log('Seeding courses...');
  const bsit = await upsertCourse(cit._id, 'Bachelor of Science in Information Technology', 'BSIT');
  await upsertCourse(cit._id, 'Bachelor of Science in Computer Science', 'BSCS');

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

  // These match the "Demonstration Coordinates" shown on the Login screen for each role button.
  console.log('Seeding demo accounts...');
  await upsertUser({
    email: 'admin@normi.edu.ph', password: 'admin123', name: 'Dr. Irish Mea D. Sajol', role: 'admin',
  });
  await upsertUser({
    email: 'coordinator@normi.edu.ph', password: 'coord123', name: 'Prof. Patrick Earl O. Kimpang', role: 'coordinator', departmentId: cit._id,
  });
  await upsertUser({
    email: 'adviser@normi.edu.ph', password: 'adviser123', name: 'Dr. John Mark L. Dumalag', role: 'adviser', departmentId: cit._id, phone: '+639171234567',
  });
  await upsertUser({
    email: 'panel@normi.edu.ph', password: 'panel123', name: 'Dr. Arthur S. Pendelton', role: 'panelist', departmentId: cit._id, phone: '+639201234567',
  });
  await upsertUser({
    email: 'student@normi.edu.ph', password: 'student123', name: 'Juan Dela Cruz', role: 'student', departmentId: cit._id, courseId: bsit._id, phone: '+639304567890',
  });

  console.log('\nSeed complete.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
