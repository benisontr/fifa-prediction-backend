const mongoose = require('mongoose');
const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const { validatePenaltyWinner } = require('../utils/penaltyWinner.util');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const calculatePredictedWinner = (scoreA, scoreB, teamA, teamB) => {
  if (scoreA > scoreB) return teamA;
  if (scoreB > scoreA) return teamB;
  return 'DRAW';
};

const createPrediction = async (req, res) => {
  try {
    const { matchId, predictedTeamAScore, predictedTeamBScore, penaltyWinner } = req.body;
    const userId = req.user._id;

    if (!matchId) {
      return res.status(400).json({ success: false, message: 'matchId is required' });
    }

    if (!isValidObjectId(matchId)) {
      return res.status(400).json({ success: false, message: 'Invalid matchId' });
    }

    const scoreA = Number(predictedTeamAScore);
    const scoreB = Number(predictedTeamBScore);

    if (Number.isNaN(scoreA) || scoreA < 0) {
      return res.status(400).json({ success: false, message: 'predictedTeamAScore must be a non-negative number' });
    }

    if (Number.isNaN(scoreB) || scoreB < 0) {
      return res.status(400).json({ success: false, message: 'predictedTeamBScore must be a non-negative number' });
    }

    const match = await Match.findById(matchId).lean().exec();
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Predictions are closed for this match' });
    }

    const now = new Date();
    if (now > new Date(match.predictionClosingTime)) {
      return res.status(400).json({ success: false, message: 'Prediction closing time has passed' });
    }

    const existingPrediction = await Prediction.findOne({ userId, matchId }).lean().exec();
    if (existingPrediction) {
      return res.status(409).json({ success: false, message: 'Prediction for this match already exists' });
    }

    const predictedWinner = calculatePredictedWinner(scoreA, scoreB, match.teamA, match.teamB);
    const isDrawPrediction = scoreA === scoreB;

    let finalPenaltyWinner = null;
    try {
      finalPenaltyWinner = validatePenaltyWinner(penaltyWinner, match.teamA, match.teamB, isDrawPrediction);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const prediction = new Prediction({
      userId,
      matchId,
      predictedTeamAScore: scoreA,
      predictedTeamBScore: scoreB,
      predictedWinner,
      penaltyWinner: finalPenaltyWinner,
    });

    const savedPrediction = await prediction.save();
    return res.status(201).json({ success: true, data: savedPrediction });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Prediction already exists for this match' });
    }

    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const getMyPredictions = async (req, res) => {
  try {
    const userId = req.user._id;

    const predictions = await Prediction.find({ userId })
      .populate({ path: 'matchId' })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return res.json({ success: true, data: predictions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const updatePrediction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      predictedTeamAScore,
      predictedTeamBScore,
      penaltyWinner,
      matchId: bodyMatchId,
      predictedWinner,
      userId,
      pointsEarned,
      ...rest
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid prediction id' });
    }

    const prediction = await Prediction.findById(id);
    if (!prediction) {
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    }

    if (prediction.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not own this prediction' });
    }

    if (bodyMatchId && bodyMatchId.toString() !== prediction.matchId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot change matchId on an existing prediction' });
    }

    if (predictedWinner !== undefined || userId !== undefined || pointsEarned !== undefined) {
      return res.status(400).json({ success: false, message: 'predictedWinner, userId, and pointsEarned cannot be modified' });
    }

    const match = await Match.findById(prediction.matchId).lean().exec();
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Predictions are closed for this match' });
    }

    const now = new Date();
    if (now > new Date(match.predictionClosingTime)) {
      return res.status(400).json({ success: false, message: 'Prediction closing time has passed' });
    }

    const updates = {};
    if (predictedTeamAScore !== undefined) {
      const scoreA = Number(predictedTeamAScore);
      if (Number.isNaN(scoreA) || scoreA < 0) {
        return res.status(400).json({ success: false, message: 'predictedTeamAScore must be a non-negative number' });
      }
      updates.predictedTeamAScore = scoreA;
    }

    if (predictedTeamBScore !== undefined) {
      const scoreB = Number(predictedTeamBScore);
      if (Number.isNaN(scoreB) || scoreB < 0) {
        return res.status(400).json({ success: false, message: 'predictedTeamBScore must be a non-negative number' });
      }
      updates.predictedTeamBScore = scoreB;
    }

    if (Object.keys(rest).length > 0) {
      return res.status(400).json({ success: false, message: 'Only score fields may be updated' });
    }

    const finalScoreA = updates.predictedTeamAScore ?? prediction.predictedTeamAScore;
    const finalScoreB = updates.predictedTeamBScore ?? prediction.predictedTeamBScore;
    const isDrawPrediction = finalScoreA === finalScoreB;

    let finalPenaltyWinner = null;
    try {
      finalPenaltyWinner = validatePenaltyWinner(
        penaltyWinner !== undefined ? penaltyWinner : prediction.penaltyWinner,
        match.teamA,
        match.teamB,
        isDrawPrediction
      );
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    updates.penaltyWinner = finalPenaltyWinner;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update' });
    }

    prediction.predictedTeamAScore = updates.predictedTeamAScore ?? prediction.predictedTeamAScore;
    prediction.predictedTeamBScore = updates.predictedTeamBScore ?? prediction.predictedTeamBScore;
    prediction.penaltyWinner = updates.penaltyWinner;
    prediction.predictedWinner = calculatePredictedWinner(
      prediction.predictedTeamAScore,
      prediction.predictedTeamBScore,
      match.teamA,
      match.teamB
    );

    const savedPrediction = await prediction.save();
    return res.json({ success: true, data: savedPrediction });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const deletePrediction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid prediction id' });
    }

    const prediction = await Prediction.findById(id);
    if (!prediction) {
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    }

    if (prediction.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not own this prediction' });
    }

    const match = await Match.findById(prediction.matchId).lean().exec();
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const now = new Date();
    if (now > new Date(match.predictionClosingTime)) {
      return res.status(400).json({ success: false, message: 'Prediction closing time has passed' });
    }

    if (match.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Predictions are closed for this match' });
    }

    await Prediction.deleteOne({ _id: id });
    return res.json({ success: true, data: {} });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = {
  createPrediction,
  getMyPredictions,
  updatePrediction,
  deletePrediction,
};
