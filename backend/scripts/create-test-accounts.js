// TESTING ONLY. Creates one account for each role so you can try the whole system.
//
//   npm run test-accounts
//
// - The password is NOT written in this file. Set TEST_PASSWORD to choose one, or leave it empty and a
//   random password is made and shown once at the end.
// - Run `npm run seed` first (it creates the departments and courses these accounts belong to).
// - It refuses to run when NODE_ENV=production, unless you add --force.
// - Delete these accounts from "Manage Accounts" before the system is used for real.
require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Department = require('../src/models/Department');
const Course = require('../src/models/Course');
const User = require('../src/models/User');

const roles = [
  { role: 'admin', label: 'Admin' },
  { role: 'coordinator', label: 'Coordinator' },
  { role: 'adviser', label: 'Adviser' },
  { role: 'panelist', label: 'Panel Member', emailName: 'panel' },
  { role: 'student', label: 'Student' },
];

const randomPassword = () => {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(14), (b) => letters[b % letters.length]).join('');
};

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    throw new Error('This is a testing tool and NODE_ENV is "production". Add --force only if you are sure.');
  }

  await connectDB();

  const department = (await Department.findOne({ code: 'CIT' })) || (await Department.findOne());
  if (!department) throw new Error('No departments found. Run `npm run seed` first.');
  const course = await Course.findOne({ departmentId: department._id });

  const password = process.env.TEST_PASSWORD || randomPassword();
  if (password.length < 8) throw new Error('TEST_PASSWORD must be at least 8 characters long.');

  const created = [];
  for (const { role, label, emailName } of roles) {
    const email = `test.${emailName || role}@normi.edu.ph`;
    if (await User.findOne({ email })) {
      console.log(`  skipped (already exists, password unchanged): ${email}`);
      continue;
    }
    await User.create({
      email,
      password,
      name: `Test ${label}`,
      role,
      status: 'active',
      departmentId: role === 'admin' ? undefined : department._id,
      courseId: role === 'student' ? course?._id : undefined,
    });
    created.push(email);
    console.log(`  created: ${email} (${label})`);
  }

  if (created.length > 0) {
    console.log('\n=================== TEST ACCOUNTS (testing only) ===================');
    console.log(`Password for the ${created.length} new account(s): ${password}`);
    console.log('Write it down now. It is stored only as a hash and is not shown again.');
    console.log('Delete these accounts from "Manage Accounts" before real use.');
    console.log('====================================================================');
  } else {
    console.log('\nNothing new was created.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nCould not create the test accounts:', err.message);
  process.exit(1);
});
