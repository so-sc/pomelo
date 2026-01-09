const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    required: true,
  },
  // Added joinId 
  joinId: {
    type: String,
    unique: true,

  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  // Added duration for Module 1 logic (calculated in minutes)
  duration: {
    type: Number,

  },
  questions: [String],
  author: {
    type: String,
    required: true,
  },
  rules: {
    type: [String],
    default: [],
  },
  // Added violations array to support the manageViolations controller
  violations: [
    {
      user: String,
      timestamp: { type: Date, default: Date.now },
      details: String,
    }
  ],
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'private',
  },
  status: {
    type: String,
    enum: ['waiting', 'ongoing', 'completed'],
    default: 'waiting',
  },
}, { timestamps: true });

// Pre-save middleware to automatically calculate duration if not provided
contestSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const diffInMs = this.endTime - this.startTime;
    this.duration = Math.floor(diffInMs / (1000 * 60)); // Convert ms to minutes
  }
  next();
});

module.exports = mongoose.models.Contest || mongoose.model('Contest', contestSchema);