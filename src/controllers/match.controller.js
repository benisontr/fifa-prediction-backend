const mongoose = require('mongoose');
const Match = require('../models/Match');

/**
 * CREATE MATCH
 * POST /api/admin/matches
 * Admin only
 */
const createMatch = async (req, res) => {
  try {
    const {
      teamA,
      teamB,
      matchDateTime,
      predictionClosingTime,
      perfectScorePoint,
      winnerOnlyPoint,
    } = req.body;

    // Validation: Required fields
    if (
      !teamA ||
      !teamB ||
      !matchDateTime ||
      !predictionClosingTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          'teamA, teamB, matchDateTime, and predictionClosingTime are required',
      });
    }

    // Validation: teamA and teamB are different
    if (teamA.trim().toLowerCase() === teamB.trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Team A and Team B cannot be the same',
      });
    }

    // Validation: predictionClosingTime is before matchDateTime
    const closingTime = new Date(predictionClosingTime);
    const startTime = new Date(matchDateTime);

    if (closingTime >= startTime) {
      return res.status(400).json({
        success: false,
        message:
          'Prediction closing time must be before match start time',
      });
    }

    // Create match
    const match = await Match.create({
      teamA: teamA.trim(),
      teamB: teamB.trim(),
      matchDateTime: startTime,
      predictionClosingTime: closingTime,
      perfectScorePoint:
        perfectScorePoint !== undefined ? perfectScorePoint : 2,
      winnerOnlyPoint:
        winnerOnlyPoint !== undefined ? winnerOnlyPoint : 1,
    });

    return res.status(201).json({
      success: true,
      data: match,
    });
  } catch (error) {
    console.error('Error creating match:', error);

    if (error.message.includes('A team cannot play against itself')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message.includes(
        'Prediction closing time must be before match start time'
      )
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error while creating match',
    });
  }
};

/**
 * GET ALL MATCHES
 * GET /api/admin/matches
 * Admin only
 */
const getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .sort({ createdAt: -1 });

    const total = await Match.countDocuments();

    return res.status(200).json({
      success: true,
      data: matches,
      total,
    });
  } catch (error) {
    console.error('Error fetching matches:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching matches',
    });
  }
};

/**
 * GET MATCH BY ID
 * GET /api/admin/matches/:id
 * Admin only
 */
const getMatchById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation: ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid match ID',
      });
    }

    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    console.error('Error fetching match:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching match',
    });
  }
};

/**
 * UPDATE MATCH
 * PUT /api/admin/matches/:id
 * Admin only
 */
const updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      teamA,
      teamB,
      matchDateTime,
      predictionClosingTime,
      perfectScorePoint,
      winnerOnlyPoint,
    } = req.body;

    // Validation: ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid match ID',
      });
    }

    // Find match
    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Validation: Cannot update if status is completed
    if (match.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a completed match',
      });
    }

    // Prepare update object
    const updateData = {};

    if (teamA !== undefined) {
      updateData.teamA = teamA.trim();
    }

    if (teamB !== undefined) {
      updateData.teamB = teamB.trim();
    }

    if (matchDateTime !== undefined) {
      updateData.matchDateTime = new Date(matchDateTime);
    }

    if (predictionClosingTime !== undefined) {
      updateData.predictionClosingTime = new Date(
        predictionClosingTime
      );
    }

    if (perfectScorePoint !== undefined) {
      updateData.perfectScorePoint = perfectScorePoint;
    }

    if (winnerOnlyPoint !== undefined) {
      updateData.winnerOnlyPoint = winnerOnlyPoint;
    }

    // Validation: teamA and teamB are different (if either is being updated)
    const finalTeamA = updateData.teamA || match.teamA;
    const finalTeamB = updateData.teamB || match.teamB;

    if (finalTeamA.toLowerCase() === finalTeamB.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Team A and Team B cannot be the same',
      });
    }

    // Validation: predictionClosingTime is before matchDateTime
    const finalClosingTime = updateData.predictionClosingTime
      ? new Date(updateData.predictionClosingTime)
      : match.predictionClosingTime;
    const finalStartTime = updateData.matchDateTime
      ? new Date(updateData.matchDateTime)
      : match.matchDateTime;

    if (finalClosingTime >= finalStartTime) {
      return res.status(400).json({
        success: false,
        message:
          'Prediction closing time must be before match start time',
      });
    }

    // Update match
    const updatedMatch = await Match.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: updatedMatch,
    });
  } catch (error) {
    console.error('Error updating match:', error);

    if (error.message.includes('A team cannot play against itself')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message.includes(
        'Prediction closing time must be before match start time'
      )
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error while updating match',
    });
  }
};

/**
 * DELETE MATCH
 * DELETE /api/admin/matches/:id
 * Admin only
 */
const deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation: ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid match ID',
      });
    }

    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Validation: Cannot delete if status is completed
    if (match.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a completed match',
      });
    }

    await Match.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Match deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting match:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while deleting match',
    });
  }
};

/**
 * GET ACTIVE MATCHES
 * GET /api/matches/active
 * Authenticated users
 * Returns matches where predictionClosingTime > current server time AND status = "open"
 */
const getActiveMatches = async (req, res) => {
  try {
    // Use server time only
    const now = new Date();

    const matches = await Match.find({
      predictionClosingTime: { $gt: now },
      status: 'open',
    })
      .sort({ matchDateTime: 1 });

    return res.status(200).json({
      success: true,
      data: matches,
      total: matches.length,
    });
  } catch (error) {
    console.error('Error fetching active matches:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching active matches',
    });
  }
};

/**
 * GET UPCOMING MATCHES
 * GET /api/matches/upcoming
 * Authenticated users
 * Returns all future matches sorted by matchDateTime ascending
 */
const getUpcomingMatches = async (req, res) => {
  try {
    // Use server time only
    const now = new Date();

    const matches = await Match.find({
      matchDateTime: { $gt: now },
    })
      .sort({ matchDateTime: 1 });

    return res.status(200).json({
      success: true,
      data: matches,
      total: matches.length,
    });
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching upcoming matches',
    });
  }
};

module.exports = {
  createMatch,
  getAllMatches,
  getMatchById,
  updateMatch,
  deleteMatch,
  getActiveMatches,
  getUpcomingMatches,
};
