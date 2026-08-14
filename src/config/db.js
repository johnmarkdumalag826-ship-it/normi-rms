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
    process.exit(1);
  }
};

module.exports = connectDB;
