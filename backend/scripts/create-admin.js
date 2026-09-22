// Creates the FIRST real Admin account. Run it once, after `npm run seed`.
//
//   npm run create-admin
//
// It asks for a name, an email and a password. The password is hidden while you type it and is
// stored only as a hash. You can also skip the questions by setting ADMIN_NAME, ADMIN_EMAIL and
// ADMIN_PASSWORD in the environment.
//
// After that, everyone else registers themselves on the sign-in page, and you approve or reject them in "Manage Accounts".
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = function (text) {
      if (hidden && this.line !== undefined && !text.includes('\n') && !text.includes(question)) {
        this.output.write('*');
      } else {
        this.output.write(text);
      }
    };
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

async function main() {
  await connectDB();

  const name = process.env.ADMIN_NAME || (await ask('Full name of the Admin: '));
  const email = (process.env.ADMIN_EMAIL || (await ask('Email of the Admin: '))).toLowerCase();
  const password = process.env.ADMIN_PASSWORD || (await ask('Password (at least 10 characters): ', { hidden: true }));

  if (!name || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Please give a name and a valid email address.');
  if (password.length < 10) throw new Error('The password must be at least 10 characters long.');

  if (await User.findOne({ email })) throw new Error(`An account with ${email} already exists.`);

  await User.create({ name, email, password, role: 'admin', status: 'active' });
  console.log(`\nDone. Admin account created for ${email}.`);
  console.log('Sign in on the website. Everyone else registers themselves; approve or reject them in "Manage Accounts".');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nCould not create the Admin:', err.message);
  process.exit(1);
});
