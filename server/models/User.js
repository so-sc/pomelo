const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  // Absent for accounts that only sign in through a provider (see `accounts`).
  passwordHash: {
    type: String,
    required: function () { return !this.accounts?.length; },
    select: false,
  },
  // External sign-in identities linked to this user, e.g. { provider: "google", providerAccountId: <sub> }.
  accounts: [{
    _id: false,
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
  }],
  avatar: {
    type: String,
    maxlength: 2048,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
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

// One provider identity can belong to only one user.
userSchema.index(
  { 'accounts.provider': 1, 'accounts.providerAccountId': 1 },
  { unique: true, partialFilterExpression: { 'accounts.provider': { $exists: true } } }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
