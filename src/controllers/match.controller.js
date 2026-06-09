const mongoose = require('mongoose');
const Match = require('../models/Match');
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const { calculatePoints } = require('../services/scoring.service');

// Helper to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Create a new match (Admin)
const createMatch = async (req, res) => {
  try {
    const {
      teamA,
      teamB,
      matchDateTime,
      predictionClosingTime,
      winnerOnlyPoint = 0,
      ...rest
    } = req.body;

    if (!teamA) return res.status(400).json({ success: false, message: 'teamA is required' });
    if (!teamB) return res.status(400).json({ success: false, message: 'teamB is required' });
    if (!matchDateTime) return res.status(400).json({ success: false, message: 'matchDateTime is required' });
    if (!predictionClosingTime) return res.status(400).json({ success: false, message: 'predictionClosingTime is required' });

    if (teamA === teamB) return res.status(400).json({ success: false, message: 'teamA and teamB must be different' });

    const matchDate = new Date(matchDateTime);
    const predClose = new Date(predictionClosingTime);

    if (Number.isNaN(matchDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid matchDateTime' });
    if (Number.isNaN(predClose.getTime()) || predClose.getTime() <= 0) return res.status(400).json({ success: false, message: 'Invalid predictionClosingTime' });

    const winnerPoints = Number(winnerOnlyPoint);
    if (Number.isNaN(winnerPoints) || winnerPoints < 0) return res.status(400).json({ success: false, message: 'winnerOnlyPoint must be >= 0' });

    const newMatch = new Match({
      teamA: teamA.trim(),
      teamB: teamB.trim(),
      matchDateTime: matchDate,
      predictionClosingTime: predClose,
      winnerOnlyPoint: winnerPoints,
      status: rest.status || 'open',
      ...rest,
    });

    const saved = await newMatch.save();
    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Get all matches (Admin)
const getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find({}).sort({ createdAt: -1 }).lean().exec();
    const total = await Match.countDocuments();
    return res.json({ success: true, data: { total, matches } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Get match by id (Admin)
const getMatchById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid match id' });

    const match = await Match.findById(id).lean().exec();
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    return res.json({ success: true, data: match });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Update match (Admin)
const updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid match id' });

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    if (match.status === 'completed' || match.completed === true) {
      return res.status(400).json({ success: false, message: 'Cannot modify a completed match' });
    }

    if (new Date() >= new Date(match.matchDateTime)) {
      return res.status(400).json({ success: false, message: 'Cannot modify a match that has already started' });
    }

    const updates = { ...req.body };

    // Validate teamA and teamB
    if (updates.teamA && updates.teamB && updates.teamA === updates.teamB) {
      return res.status(400).json({ success: false, message: 'teamA and teamB must be different' });
    }

    // Validate matchDateTime
    if (updates.matchDateTime) {
      const md = new Date(updates.matchDateTime);
      if (Number.isNaN(md.getTime())) return res.status(400).json({ success: false, message: 'Invalid matchDateTime' });
      updates.matchDateTime = md;
    }

    // Validate predictionClosingTime
    if (updates.predictionClosingTime) {
      const predClose = new Date(updates.predictionClosingTime);
      if (Number.isNaN(predClose.getTime()) || predClose.getTime() <= 0) return res.status(400).json({ success: false, message: 'Invalid predictionClosingTime' });
      updates.predictionClosingTime = predClose;
    }

    // Validate that predictionClosingTime is before matchDateTime
    const finalMatchDateTime = updates.matchDateTime || match.matchDateTime;
    const finalPredClosingTime = updates.predictionClosingTime || match.predictionClosingTime;
    if (new Date(finalPredClosingTime) >= new Date(finalMatchDateTime)) {
      return res.status(400).json({ success: false, message: 'Prediction closing time must be before match start time' });
    }

    // Validate perfectScorePoint
    if (typeof updates.perfectScorePoint !== 'undefined') {
      const psp = Number(updates.perfectScorePoint);
      if (Number.isNaN(psp) || psp < 0) return res.status(400).json({ success: false, message: 'perfectScorePoint must be >= 0' });
      updates.perfectScorePoint = psp;
    }

    // Validate winnerOnlyPoint
    if (typeof updates.winnerOnlyPoint !== 'undefined') {
      const wp = Number(updates.winnerOnlyPoint);
      if (Number.isNaN(wp) || wp < 0) return res.status(400).json({ success: false, message: 'winnerOnlyPoint must be >= 0' });
      updates.winnerOnlyPoint = wp;
    }

    // Validate actualTeamAScore
    if (typeof updates.actualTeamAScore !== 'undefined' && updates.actualTeamAScore !== null) {
      const score = Number(updates.actualTeamAScore);
      if (Number.isNaN(score) || score < 0) return res.status(400).json({ success: false, message: 'actualTeamAScore must be a non-negative number' });
      updates.actualTeamAScore = score;
    }

    // Validate actualTeamBScore
    if (typeof updates.actualTeamBScore !== 'undefined' && updates.actualTeamBScore !== null) {
      const score = Number(updates.actualTeamBScore);
      if (Number.isNaN(score) || score < 0) return res.status(400).json({ success: false, message: 'actualTeamBScore must be a non-negative number' });
      updates.actualTeamBScore = score;
    }

    // Validate status
    if (updates.status) {
      const validStatus = ['open', 'closed', 'completed'];
      if (!validStatus.includes(updates.status)) {
        return res.status(400).json({ success: false, message: `status must be one of: ${validStatus.join(', ')}` });
      }
    }

    // Validate actualWinner
    if (updates.actualWinner !== undefined) {
      if (updates.actualWinner !== null) {
        const teamA = updates.teamA || match.teamA;
        const teamB = updates.teamB || match.teamB;
        const validWinners = [teamA, teamB, 'draw'];
        if (!validWinners.includes(updates.actualWinner)) {
          return res.status(400).json({ success: false, message: `actualWinner must be '${teamA}', '${teamB}', 'draw', or null` });
        }
      }
    }

    Object.assign(match, updates);
    const saved = await match.save();
    return res.json({ success: true, data: saved });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Submit match result and score predictions (Admin)
const submitMatchResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualTeamAScore, actualTeamBScore } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid match id' });
    }

    if (typeof actualTeamAScore === 'undefined' || typeof actualTeamBScore === 'undefined') {
      return res.status(400).json({ success: false, message: 'Both actualTeamAScore and actualTeamBScore are required' });
    }

    const teamAScore = Number(actualTeamAScore);
    const teamBScore = Number(actualTeamBScore);

    if (!Number.isInteger(teamAScore) || teamAScore < 0) {
      return res.status(400).json({ success: false, message: 'actualTeamAScore must be a non-negative integer' });
    }

    if (!Number.isInteger(teamBScore) || teamBScore < 0) {
      return res.status(400).json({ success: false, message: 'actualTeamBScore must be a non-negative integer' });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Match has already been completed' });
    }

    match.actualTeamAScore = teamAScore;
    match.actualTeamBScore = teamBScore;

    if (teamAScore > teamBScore) {
      match.actualWinner = match.teamA;
    } else if (teamBScore > teamAScore) {
      match.actualWinner = match.teamB;
    } else {
      match.actualWinner = 'DRAW';
    }

    const predictions = await Prediction.find({ matchId: match._id }).lean().exec();
    let processedPredictions = 0;

    for (const prediction of predictions) {
      const points = calculatePoints(prediction, match);

      await Prediction.findByIdAndUpdate(
        prediction._id,
        { pointsEarned: points },
        { new: true }
      ).exec();

      await User.findByIdAndUpdate(
        prediction.userId,
        { $inc: { totalPoints: points } },
        { new: true }
      ).exec();

      processedPredictions += 1;
    }

    match.status = 'completed';
    await match.save();

    return res.json({
      success: true,
      message: 'Match result processed successfully',
      processedPredictions,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Delete match (Admin)
const deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid match id' });

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    if (match.status === 'completed' || match.completed === true) {
      return res.status(400).json({ success: false, message: 'Cannot delete a completed match' });
    }

    if (new Date() >= new Date(match.matchDateTime)) {
      return res.status(400).json({ success: false, message: 'Cannot delete a match that has already started' });
    }

    await Match.deleteOne({ _id: id });
    return res.json({ success: true, data: {} });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Get active matches (Authenticated users)
const getActiveMatches = async (req, res) => {
  try {
    const now = new Date();
    const matches = await Match.find({ predictionClosingTime: { $gt: now }, status: 'open' })
      .sort({ matchDateTime: 1 })
      .lean()
      .exec();
    return res.json({ success: true, data: matches });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Get upcoming matches (Authenticated users)
const getUpcomingMatches = async (req, res) => {
  try {
    const now = new Date();
    const matches = await Match.find({ matchDateTime: { $gt: now } })
      .sort({ matchDateTime: 1 })
      .lean()
      .exec();
    return res.json({ success: true, data: matches });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = {
  createMatch,
  getAllMatches,
  getMatchById,
  updateMatch,
  submitMatchResult,
  deleteMatch,
  getActiveMatches,
  getUpcomingMatches,
};

