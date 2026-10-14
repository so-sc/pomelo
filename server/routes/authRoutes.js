const express = require('express');
const router = express.Router();
const { handleLogin, handleRegister, handleGoogleAuth } = require('../controllers/authCon');
const { authLimiter } = require('../middlewares/rateLimiter');

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Login / Verify Credentials
router.post('/login', handleLogin);

// Register
router.post('/register', handleRegister);

// Google sign-in: verify the id_token and find, link or provision the user
router.post('/google', handleGoogleAuth);

module.exports = router;
