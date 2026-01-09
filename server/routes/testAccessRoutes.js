const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/contestAuth'); 
const { 
    validateJoinId, 
    getLandingDetails      // Import this too
} = require('../controllers/testAccessController');

const {
     getContestData, 
    startTest
} = require('../controllers/contestCon');

// 1. Validation (6-digit ID)
router.post('/validate', protect, validateJoinId);

// 2. Landing Page Metadata
router.get('/:id/landing', protect, getLandingDetails);

// 3. START the test (Creates the session)
router.post('/start', protect, startTest);

// 4. Fetch Questions for the Session
// This matches: GET /api/test-access/data?contestId=...
router.get('/data', protect, getContestData);

module.exports = router;