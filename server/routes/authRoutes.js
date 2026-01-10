const express = require('express');
const router = express.Router();
const { handleLogin, handleRegister } = require('../controllers/authCon');

// Login / Verify Credentials
router.post('/login', handleLogin);

// Register
router.post('/register', handleRegister);

module.exports = router;
