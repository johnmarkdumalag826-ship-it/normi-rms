const mongoose = require('mongoose');
const idPlugin = require('../utils/idPlugin');

// Must run before any model file is required, so every schema picks up the
// _id -> id toJSON transform. Safe here since every entry point requires this
// module (for connectDB) before requiring any route/controller/model file.
mongoose.plugin(idPlugin);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    const m = String(err.message).toLowerCase();
    if (!process.env.MONGODB_URI) {
      console.error('-> MONGODB_URI is empty. Put your database address in backend/.env.');
    } else if (m.includes('authentication failed') || m.includes('bad auth')) {
      console.error('-> The database user name or password is wrong. In Atlas open Database Access and check them.');
      console.error('   If the password has symbols like @ or #, choose a simpler password (letters and numbers).');
    } else if (m.includes('ip') && m.includes('whitelist') || m.includes('could not connect to any servers') || m.includes('timed out') || m.includes('serverselection')) {
      console.error('-> Atlas is refusing this computer. In Atlas open Network Access and add your IP address');
      console.error('   (or "Allow access from anywhere" while testing). Then wait about a minute and try again.');
    } else if (m.includes('enotfound') || m.includes('querysrv')) {
      console.error('-> The database address could not be found. Copy the address from Atlas again, or check your internet.');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
