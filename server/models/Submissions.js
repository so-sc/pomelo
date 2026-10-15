const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  contest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Ongoing', 'Completed'],
    default: 'Ongoing',
  },
  forcedSubmission: {
    type: Boolean,
    default: false,
  },
  autoSubmitReason: {
    type: String,
    trim: true,
  },
  submittedAt: Date,
  feedback: {
    type: new mongoose.Schema({
      difficulty: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
      experience: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
      comment: { type: String, trim: true, maxlength: 2000, default: '' },
      submittedAt: { type: Date, default: Date.now },
    }, { _id: false }),
    default: undefined,
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  submissions: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
    answer: [String], // MCQ answers (e.g., ["A"] or ["A", "C", "D"])
    // Coding specific fields
    code: String,
    language: String,
    status: {
      type: String,
      enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compilation Error', 'System Error', 'Pending'],
    },
    testCaseResults: {
      type: [{
        testCase: Number,
        passed: Boolean,
        input: String,
        expectedOutput: String,
        actualOutput: String,
        error: String,
        // Raw engine verdict, e.g. "Runtime Error (SIGSEGV)" — more specific than the enum above.
        status: String,
        executionTime: Number, // CPU time in milliseconds
        memoryUsed: Number, // peak memory in KB
      }],
      default: undefined
    },
    // Totals across the submission's test cases.
    executionTime: Number, // in milliseconds
    memoryUsed: Number, // in KB
    score: {
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    // The graded fields above are the best attempt; these are the most recent one.
    lastCode: String,
    lastLanguage: String,
    lastSubmittedAt: Date,
  }],
}, { timestamps: true });

// Ensure one attempt per user per contest
submissionSchema.index({ contest: 1, user: 1 }, { unique: true });

// Backs the ranked-leaderboard sort/pagination
submissionSchema.index({ contest: 1, totalScore: -1 });

module.exports = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
