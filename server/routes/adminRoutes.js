const express = require("express");
const { requireAuth } = require("../middlewares/checkAuth");
const isAdmin = require("../middlewares/isAdmin");
const {
  createProblem,
  updateProblem,
  deleteQuestion,
  getProblemDetail,
  getAdminContests,
  getAdminContestDetail,
  createContest,
  updateContest,
  getAdminContestResults,
  deleteContest,
  getAdminStats,
} = require("../controllers/adminCon");
const { getData, getOne } = require("../controllers/dataCon");

const router = express.Router();

// Questions
router.post("/questions/create", requireAuth(), createProblem);
router.put("/questions/:id/edit", requireAuth(), updateProblem);
router.get("/questions/:id", requireAuth(), getProblemDetail);
router.delete("/questions/:id", requireAuth(), deleteQuestion);

// Contests
router.get("/tests", requireAuth(), getAdminContests);
router.get("/tests/:id", requireAuth(), getAdminContestDetail);
router.post("/tests/create", requireAuth(), createContest);
router.put("/tests/:id/edit", requireAuth(), updateContest);
router.delete("/tests/:id", requireAuth(), deleteContest);
router.get("/tests/:id/result", requireAuth(), isAdmin, getAdminContestResults);

// Dashboard Stats
router.get("/stats", requireAuth(), getAdminStats);

// Generic Data Endpoints
router.post("/data", requireAuth(), getData);
router.post("/data/one", requireAuth(), getOne);

module.exports = router;
