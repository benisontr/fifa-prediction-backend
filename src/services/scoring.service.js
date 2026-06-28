const calculatePoints = (prediction, match) => {
  if (!prediction || !match) {
    return 0;
  }

  const predictedTeamAScore = Number(prediction.predictedTeamAScore);
  const predictedTeamBScore = Number(prediction.predictedTeamBScore);
  const actualTeamAScore = Number(match.actualTeamAScore);
  const actualTeamBScore = Number(match.actualTeamBScore);

  const normalizeWinner = (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.trim().toUpperCase();
  };

  const predictedWinner = normalizeWinner(prediction.predictedWinner);
  const actualWinner = normalizeWinner(match.actualWinner);

  const perfectPoints = Number(match.perfectScorePoint) || 0;
  const winnerPoints = Number(match.winnerOnlyPoint) || 0;

  if (
    Number.isInteger(predictedTeamAScore) &&
    Number.isInteger(predictedTeamBScore) &&
    Number.isInteger(actualTeamAScore) &&
    Number.isInteger(actualTeamBScore) &&
    predictedTeamAScore === actualTeamAScore &&
    predictedTeamBScore === actualTeamBScore
  ) {
    if (actualWinner !== 'DRAW') {
      return perfectPoints;
    }

    const normalizedPredictionPenaltyWinner = normalizeWinner(prediction.penaltyWinner);
    const normalizedMatchPenaltyWinner = normalizeWinner(match.penaltyWinnerTeam);

    if (
      normalizedPredictionPenaltyWinner &&
      normalizedMatchPenaltyWinner &&
      normalizedPredictionPenaltyWinner === normalizedMatchPenaltyWinner
    ) {
      return perfectPoints;
    }

    return winnerPoints;
  }

  if (predictedWinner === 'DRAW' && actualWinner === 'DRAW') {
    return winnerPoints;
  }

  if (predictedWinner && actualWinner && predictedWinner === actualWinner) {
    return winnerPoints;
  }

  return 0;
};

module.exports = {
  calculatePoints,
};
