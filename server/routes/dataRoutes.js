const express = require("express");
const router = express.Router();
const { getData, getOne } = require("../controllers/dataCon");
const { requireAuth } = require("../middlewares/checkAuth");

// Generic Data Endpoint (Option 1)
// Protected by Auth
router.post("/", requireAuth(), getData);
router.post("/one", requireAuth(), getOne);

module.exports = router;
