const mongoose = require('mongoose');
const User = require('../models/User');
const Match = require('../models/Match');
const Prediction = require('../models/Prediction');

// Helper to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * GET /api/leaderboard
 * Get all users sorted by totalPoints (descending) with rank
 * Access: Authenticated users
 */
const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({})
      .select('_id name totalPoints')
      .sort({ totalPoints: -1 })
      .lean()
      .exec();

    // Add rank to each user
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      _id: user._id,
      name: user.name,
      totalPoints: user.totalPoints,
    }));

    return res.json({
      success: true,
      data: leaderboard,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

/**
 * GET /api/users/me/stats
 * Get current user's prediction statistics
 * Access: Authenticated users
 * Returns: totalPredictions, totalPoints, perfectScores, correctWinners
 */
const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all predictions for the user
    const predictions = await Prediction.find({ userId })
      .populate('matchId', 'perfectScorePoint')
      .lean()
      .exec();

    // Calculate statistics
    const totalPredictions = predictions.length;
    const totalPoints = predictions.reduce((sum, pred) => sum + (pred.pointsEarned || 0), 0);
    const perfectScores = predictions.filter(
      (pred) => pred.pointsEarned === pred.matchId.perfectScorePoint
    ).length;
    const correctWinners = predictions.filter((pred) => pred.pointsEarned > 0).length;

    return res.json({
      success: true,
      data: {
        totalPredictions,
        totalPoints,
        perfectScores,
        correctWinners,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

/**
 * GET /api/matches/:id/stats
 * Get prediction statistics for a specific match
 * Access: Authenticated users
 * Returns: totalPredictions, predictedTeamAWins, predictedTeamBWins, predictedDraws
 */
const getMatchStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid match ID',
      });
    }

    // Check if match exists
    const match = await Match.findById(id).lean();
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Get all predictions for the match
    const predictions = await Prediction.find({ matchId: id })
      .select('predictedWinner')
      .lean()
      .exec();

    // Calculate statistics
    const totalPredictions = predictions.length;
    const predictedTeamAWins = predictions.filter(
      (pred) => pred.predictedWinner === match.teamA
    ).length;
    const predictedTeamBWins = predictions.filter(
      (pred) => pred.predictedWinner === match.teamB
    ).length;
    const predictedDraws = predictions.filter((pred) => pred.predictedWinner === 'Draw').length;

    return res.json({
      success: true,
      data: {
        totalPredictions,
        predictedTeamAWins,
        predictedTeamBWins,
        predictedDraws,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

/**
 * GET /api/admin/dashboard
 * Get admin dashboard statistics
 * Access: Admin only
 * Returns: totalUsers, totalMatches, totalPredictions, completedMatches, activeMatches
 */
const getAdminDashboard = async (req, res) => {
  try {
    // Use Promise.all() to execute all count operations in parallel
    const [totalUsers, totalMatches, totalPredictions] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Match.countDocuments(),
      Prediction.countDocuments(),
    ]);

    // Count completed and active matches
    const [completedMatches, activeMatches] = await Promise.all([
      Match.countDocuments({ status: 'completed' }),
      Match.countDocuments({ status: { $ne: 'completed' } }),
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalMatches,
        totalPredictions,
        completedMatches,
        activeMatches,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

/**
 * GET /api/admin/users
 * Get all users with their names and points
 * Access: Admin only
 * Returns: Array of users with name and totalPoints
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('name totalPoints')
      .sort({ totalPoints: -1 })
      .lean()
      .exec();

    return res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

module.exports = {
  getLeaderboard,
  getUserStats,
  getMatchStats,
  getAdminDashboard,
  getAllUsers,
};
