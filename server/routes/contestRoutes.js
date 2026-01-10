const express = require("express");
const { requireAuth } = require("../middlewares/checkAuth");
const {
  checkTestId,
  getContestLanding,
  startTest,
  getContestData,
  submitSolution,
  endContest,
  getTestQuestions,
} = require("../controllers/contestCon");

const router = express.Router();

// User Contest Flow
// Important: More specific routes must come before generic /:id routes
router.post("/check_valid", checkTestId);
router.get("/test/data", requireAuth(), getContestData); // Protected
router.get("/test/:id", getContestLanding); // More specific - test info
router.get("/:id/questions", getTestQuestions); // Generic - get questions for test
router.post("/start_test", requireAuth(), startTest);
router.post("/test/submit", requireAuth(), submitSolution);
router.post("/test/end", requireAuth(), endContest);

module.exports = router;
