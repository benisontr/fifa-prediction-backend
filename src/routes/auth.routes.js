const express = require('express');
const { register, login, getMe } = require('../controllers/auth.controller');
const protect = require('../middlewares/auth.middleware');

const router = express.Router();

// Register a new user
router.post('/register', register);

// Authenticate existing user
router.post('/login', login);

// Get current authenticated user
router.get('/me', protect, getMe);

module.exports = router;
