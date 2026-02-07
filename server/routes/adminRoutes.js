const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middlewares/checkAuth");
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
  importQuestions,
} = require("../controllers/adminCon");
const { getData, getOne } = require("../controllers/dataCon");

const router = express.Router();

// Multer config for CSV upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Questions
router.post("/questions/create", requireAuth(), createProblem);
router.post("/questions/import/:type", requireAuth(), upload.single('file'), importQuestions);
router.put("/questions/:id/edit", requireAuth(), updateProblem);
router.get("/questions/:id", requireAuth(), getProblemDetail);
router.delete("/questions/:id", requireAuth(), deleteQuestion);


// Contests
router.get("/tests", requireAuth(), getAdminContests);
router.get("/tests/:id", requireAuth(), getAdminContestDetail);
router.post("/tests/create", requireAuth(), createContest);
router.put("/tests/:id/edit", requireAuth(), updateContest);
router.delete("/tests/:id", requireAuth(), deleteContest);
router.get("/tests/:id/result", requireAuth(), getAdminContestResults);

// Dashboard Stats
router.get("/stats", requireAuth(), getAdminStats);

// Generic Data Endpoints
router.post("/data", requireAuth(), getData);
router.post("/data/one", requireAuth(), getOne);

module.exports = router;
