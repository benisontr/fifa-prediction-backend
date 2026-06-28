const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },

    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: [true, 'Match ID is required'],
    },

    predictedTeamAScore: {
      type: Number,
      required: [true, 'Predicted Team A score is required'],
      min: 0,
    },

    predictedTeamBScore: {
      type: Number,
      required: [true, 'Predicted Team B score is required'],
      min: 0,
    },

    predictedWinner: {
      type: String,
      required: [true, 'Predicted winner is required'],
      trim: true,
    },

    penaltyWinner: {
      type: String,
      default: null,
      trim: true,
    },

    pointsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * One prediction per user per match
 */
predictionSchema.index(
  { userId: 1, matchId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Prediction', predictionSchema);
