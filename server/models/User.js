const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  name: String,
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  registeredContests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
  }],
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
