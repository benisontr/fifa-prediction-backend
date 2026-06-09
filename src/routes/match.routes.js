const express = require('express');
const protect = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/admin.middleware');
const {
  createMatch,
  getAllMatches,
  getMatchById,
  updateMatch,
  deleteMatch,
  getActiveMatches,
  getUpcomingMatches,
} = require('../controllers/match.controller');

const router = express.Router();

/**
 * ADMIN ROUTES
 * All routes require authentication and admin access
 */

// POST /api/admin/matches - Create match
router.post('/admin/matches', protect, adminOnly, createMatch);

// GET /api/admin/matches - Get all matches
router.get('/admin/matches', protect, adminOnly, getAllMatches);

// GET /api/admin/matches/:id - Get match by ID
router.get('/admin/matches/:id', protect, adminOnly, getMatchById);

// PUT /api/admin/matches/:id - Update match
router.put('/admin/matches/:id', protect, adminOnly, updateMatch);

// DELETE /api/admin/matches/:id - Delete match
router.delete('/admin/matches/:id', protect, adminOnly, deleteMatch);

/**
 * USER ROUTES
 * All routes require authentication
 */

// GET /api/matches/active - Get active matches
router.get('/matches/active', protect, getActiveMatches);

// GET /api/matches/upcoming - Get upcoming matches
router.get('/matches/upcoming', protect, getUpcomingMatches);

module.exports = router;
