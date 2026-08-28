const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middlewares/checkAuth");
const isAdmin = require("../middlewares/isAdmin");
const {
  createProblem,
  updateProblem,
  deleteQuestion,
  getProblemDetail,
  getAdminContests,
  createContest,
  cloneContest,
  updateContest,
  endContest,
  forceEndContest,
  getAdminContestResults,
  deleteContest,
  getAdminStats,
  importQuestions,
  exportQuestion,
} = require("../controllers/adminCon");
const { exportScores, exportSubmissions } = require("../controllers/exportResultsCon");
const { getData, getOne } = require("../controllers/dataCon");
const {
  getQuestionPreview,
  runPreview,
  submitPreview,
} = require("../controllers/previewCon");
const { submissionLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// Multer config for JSON upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const isJson = file.mimetype === 'application/json' || file.originalname.endsWith('.json');
    if (isJson) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Questions
router.post("/questions/create", requireAuth(), isAdmin, createProblem);
router.post("/questions/import/:type", requireAuth(), isAdmin, upload.single('file'), importQuestions);
router.get("/questions/:id/export", requireAuth(), isAdmin, exportQuestion);
router.get("/questions/:id/preview", requireAuth(), isAdmin, getQuestionPreview);
router.post("/questions/:id/preview/run", requireAuth(), isAdmin, submissionLimiter, runPreview);
router.post("/questions/:id/preview/submit", requireAuth(), isAdmin, submissionLimiter, submitPreview);
router.put("/questions/:id/edit", requireAuth(), isAdmin, updateProblem);
router.get("/questions/:id", requireAuth(), isAdmin, getProblemDetail);
router.delete("/questions/:id", requireAuth(), isAdmin, deleteQuestion);


// Contests
router.get("/tests", requireAuth(), isAdmin, getAdminContests);
router.post("/tests/create", requireAuth(), isAdmin, createContest);
router.post("/tests/:id/clone", requireAuth(), isAdmin, cloneContest);
router.put("/tests/:id/edit", requireAuth(), isAdmin, updateContest);
router.post("/tests/:id/end", requireAuth(), isAdmin, endContest);
router.post("/tests/:id/force-end", requireAuth(), isAdmin, forceEndContest);
router.delete("/tests/:id", requireAuth(), isAdmin, deleteContest);
router.get("/tests/:id/result", requireAuth(), isAdmin, getAdminContestResults);
router.get("/tests/:id/export/scores", requireAuth(), isAdmin, exportScores);
router.get("/tests/:id/export/submissions", requireAuth(), isAdmin, exportSubmissions);

// Dashboard Stats
router.get("/stats", requireAuth(), isAdmin, getAdminStats);

// Generic Data Endpoints
router.post("/data", requireAuth(), isAdmin, getData);
router.post("/data/one", requireAuth(), isAdmin, getOne);

module.exports = router;
