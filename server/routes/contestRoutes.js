const express = require("express");
const { requireAuth } = require("../middlewares/checkAuth");
const isAdmin = require("../middlewares/isAdmin");

const {
  validateJoinId,
  getContestLanding,
  startTest,
  getContestData,
  endTest,
  getLeaderboard,
  getFeedback,
  submitFeedback,
} = require("../controllers/contestCon");

const {
  runCode,
  submitCode,
  saveMCQ
} = require("../controllers/submitCon");

const { validateContest } = require("../middlewares/contestMiddleware");
const { submissionLimiter, mcqLimiter, joinLimiter, feedbackLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// --- PUBLIC ACCESS ---

// Join via ID (returns contestId)
router.post('/join', joinLimiter, validateJoinId);

// --- ADMIN ONLY ---
// Leaderboard — ranked scores after contest ends, name only (no emails)
router.get('/:id/leaderboard', requireAuth(), isAdmin, getLeaderboard);

router.get('/:id/feedback', requireAuth(), validateContest(), getFeedback);
router.post('/:id/feedback', requireAuth(), feedbackLimiter, validateContest(), submitFeedback);

// Landing Page (Public test info) - Just needs to exist
// NOTE: This must come AFTER specific :id/something routes
router.get('/:id', validateContest(), getContestLanding);


// --- AUTHENTICATED ACTIONS ---

// Start Attempt (Create session) - Must be started, not ended
router.post('/start', requireAuth(), validateContest({ checkStarted: true, checkEnded: true, checkAttemptStatus: 'NotCompleted' }), startTest);

// Get Test Data - Must be started and not completed
router.get('/:id/data', requireAuth(), validateContest({ checkStarted: true, checkEnded: true, checkAttemptStatus: 'NotCompleted' }), getContestData);

// Run Code - Must be active and not completed
router.post('/:id/run', requireAuth(), submissionLimiter, validateContest({ checkStarted: true, checkEnded: true, checkAttemptStatus: 'NotCompleted' }), runCode);

// Submit Code Solution - Must be active and not completed
router.post('/:id/submit', requireAuth(), submissionLimiter, validateContest({ checkStarted: true, checkEnded: true, checkAttemptStatus: 'NotCompleted' }), submitCode);

// End Test
router.post('/:id/end', requireAuth(), validateContest({ checkStarted: true }), endTest);

// Save MCQ Answer - Must be not completed
router.post('/:id/mcq', requireAuth(), mcqLimiter, validateContest({ checkStarted: true, checkEnded: true, checkAttemptStatus: 'NotCompleted' }), saveMCQ);

module.exports = router;
