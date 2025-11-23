const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, min: 6, max: 255 },
  email: { type: String, max: 255, min: 6 },
  password: { type: String, max: 1024, min: 6 },
  mobile: { type: String },
  isVerified: { type: Boolean, default: false },
  emailToken: { type: String },
  otp: { type: String },
  otpExpires: { type: Date },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);