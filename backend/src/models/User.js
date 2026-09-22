const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'adviser', 'coordinator', 'panelist', 'admin'], required: true },
  avatar: String,
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  phone: String,
  status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
