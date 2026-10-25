const express = require('express');
const router = express.Router();
const { handleLogin, handleRegister, handleOAuth } = require('../controllers/authCon');
const { authIpLimiter, authLimiter } = require('../middlewares/rateLimiter');

// Apply rate limiting to all auth routes
router.use(authIpLimiter, authLimiter);

// Login / Verify Credentials
router.post('/login', handleLogin);

// Register
router.post('/register', handleRegister);

// OAuth sign-in (e.g. /oauth/google): verify the provider's token, then find, link or provision the user
router.post('/oauth/:provider', handleOAuth);

module.exports = router;
