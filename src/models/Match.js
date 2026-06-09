const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    teamA: {
      type: String,
      required: [true, 'Team A is required'],
      trim: true,
    },

    teamB: {
      type: String,
      required: [true, 'Team B is required'],
      trim: true,
    },

    matchDateTime: {
      type: Date,
      required: [true, 'Match date and time is required'],
    },

    predictionClosingTime: {
      type: Date,
      required: [true, 'Prediction closing time is required'],
    },

    perfectScorePoint: {
      type: Number,
      default: 2,
      min: 0,
    },

    winnerOnlyPoint: {
      type: Number,
      default: 1,
      min: 0,
    },

    actualTeamAScore: {
      type: Number,
      default: null,
    },

    actualTeamBScore: {
      type: Number,
      default: null,
    },

    actualWinner: {
      type: String,
      default: null,
      trim: true,
    },

    status: {
      type: String,
      enum: ['open', 'closed', 'completed'],
      default: 'open',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Validation:
 * Team A and Team B cannot be the same
 */
matchSchema.pre('save', function (next) {
  if (this.teamA === this.teamB) {
    return next(new Error('A team cannot play against itself'));
  }

  next();
});

/**
 * Validation:
 * Prediction closing time must be before match start time
 */
matchSchema.pre('save', function (next) {
  if (this.predictionClosingTime >= this.matchDateTime) {
    return next(
      new Error(
        'Prediction closing time must be before match start time'
      )
    );
  }

  next();
});

module.exports = mongoose.model('Match', matchSchema);
