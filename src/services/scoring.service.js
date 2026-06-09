const calculatePoints = (prediction, match) => {
  if (!prediction || !match) {
    return 0;
  }

  const predictedTeamAScore = Number(prediction.predictedTeamAScore);
  const predictedTeamBScore = Number(prediction.predictedTeamBScore);
  const actualTeamAScore = Number(match.actualTeamAScore);
  const actualTeamBScore = Number(match.actualTeamBScore);

  if (
    Number.isInteger(predictedTeamAScore) &&
    Number.isInteger(predictedTeamBScore) &&
    Number.isInteger(actualTeamAScore) &&
    Number.isInteger(actualTeamBScore) &&
    predictedTeamAScore === actualTeamAScore &&
    predictedTeamBScore === actualTeamBScore
  ) {
    return Number(match.perfectScorePoint) || 0;
  }

  const normalizeWinner = (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.trim().toUpperCase();
  };

  const predictedWinner = normalizeWinner(prediction.predictedWinner);
  const actualWinner = normalizeWinner(match.actualWinner);

  if (predictedWinner && actualWinner && predictedWinner === actualWinner) {
    return Number(match.winnerOnlyPoint) || 0;
  }

  return 0;
};

module.exports = {
  calculatePoints,
};
