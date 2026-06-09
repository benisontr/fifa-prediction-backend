const mongoose = require('mongoose');
const Match = require('../models/Match');

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

    if (updates.teamA && updates.teamB && updates.teamA === updates.teamB) {
      return res.status(400).json({ success: false, message: 'teamA and teamB must be different' });
    }

    if (updates.predictionClosingTime) {
      const predClose = new Date(updates.predictionClosingTime);
      if (Number.isNaN(predClose.getTime()) || predClose.getTime() <= 0) return res.status(400).json({ success: false, message: 'Invalid predictionClosingTime' });
      updates.predictionClosingTime = predClose;
    }

    if (typeof updates.winnerOnlyPoint !== 'undefined') {
      const wp = Number(updates.winnerOnlyPoint);
      if (Number.isNaN(wp) || wp < 0) return res.status(400).json({ success: false, message: 'winnerOnlyPoint must be >= 0' });
      updates.winnerOnlyPoint = wp;
    }

    if (updates.matchDateTime) {
      const md = new Date(updates.matchDateTime);
      if (Number.isNaN(md.getTime())) return res.status(400).json({ success: false, message: 'Invalid matchDateTime' });
      updates.matchDateTime = md;
    }

    Object.assign(match, updates);
    const saved = await match.save();
    return res.json({ success: true, data: saved });
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
  deleteMatch,
  getActiveMatches,
  getUpcomingMatches,
};

