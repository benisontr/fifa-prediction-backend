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

// Admin routes (require auth + admin)
router.post('/admin/matches', protect, adminOnly, createMatch);
router.get('/admin/matches', protect, adminOnly, getAllMatches);
router.get('/admin/matches/:id', protect, adminOnly, getMatchById);
router.put('/admin/matches/:id', protect, adminOnly, updateMatch);
router.delete('/admin/matches/:id', protect, adminOnly, deleteMatch);

// User routes (authenticated users)
router.get('/matches/active', protect, getActiveMatches);
router.get('/matches/upcoming', protect, getUpcomingMatches);

module.exports = router;
