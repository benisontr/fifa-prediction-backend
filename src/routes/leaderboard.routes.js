const express = require('express');
const protect = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/admin.middleware');
const {
  getLeaderboard,
  getUserStats,
  getMatchStats,
  getAdminDashboard,
} = require('../controllers/leaderboard.controller');

const router = express.Router();

/**
 * GET /api/leaderboard
 * Get leaderboard with all users sorted by totalPoints
 * Access: Authenticated users
 */
router.get('/', protect, getLeaderboard);

/**
 * GET /api/users/me/stats
 * Get current user's prediction statistics
 * Access: Authenticated users
 */
router.get('/users/me/stats', protect, getUserStats);

/**
 * GET /api/matches/:id/stats
 * Get prediction statistics for a specific match
 * Access: Authenticated users
 */
router.get('/matches/:id/stats', protect, getMatchStats);

/**
 * GET /api/admin/dashboard
 * Get admin dashboard with platform statistics
 * Access: Admin only
 */
router.get('/admin/dashboard', protect, adminOnly, getAdminDashboard);

module.exports = router;
