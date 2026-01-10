const express = require('express');
const router = express.Router();
// Use the new protect middleware we discussed
const { protect } = require('../middlewares/contestAuth'); 

const { 
    validateJoinId, 
    getLandingDetails 
} = require('../controllers/testAccessController');

const {
     getContestData, 
    startTest
} = require('../controllers/contestCon');

// --- ROUTES ---

// Validation (6-digit ID)
router.post('/validate', protect, validateJoinId);

// Landing Page Metadata
router.get('/:id/landing', protect, getLandingDetails);

// START the test (Creates the session)
router.post('/start', protect, startTest);

// Fetch Questions for the Session
router.get('/data', protect, getContestData);

module.exports = router;