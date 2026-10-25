const mongoose = require('mongoose');
const { invalidate } = require('../utils/simpleCache');
const contestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,

  joinId: {
    type: String,
    unique: true,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 1,
  },

  // Snapshots, not refs: the test owns its questions.
  questions: [require('./Question').schema],
  author: {
    type: String,
    required: true,
  },
  rules: {
    type: [String],
    default: [],
  },

  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'ended'],
  },
  // Each candidate sees the questions in their own fixed order (utils/questionOrder.js).
  shuffleQuestions: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Every write drops the cached copy here rather than at each call site, so no
// mutation path can forget and leave an attempt reading a stale contest.
const dropCache = function () {
  const id = typeof this.getFilter === 'function' ? this.getFilter()._id : this._id;
  if (id) invalidate(`contest:${id}`);
};
contestSchema.post('save', dropCache);
contestSchema.post(
  ['findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'replaceOne'],
  dropCache
);

module.exports = mongoose.models.Contest || mongoose.model('Contest', contestSchema);
