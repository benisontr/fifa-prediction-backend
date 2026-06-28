const validatePenaltyWinner = (teamName, teamA, teamB, isDraw) => {
  if (!isDraw) {
    return null;
  }

  const normalizedTeamName = typeof teamName === 'string' ? teamName.trim() : '';
  const normalizedTeamA = typeof teamA === 'string' ? teamA.trim() : '';
  const normalizedTeamB = typeof teamB === 'string' ? teamB.trim() : '';

  if (!normalizedTeamName) {
    throw new Error('Penalty winner must be one of the participating teams.');
  }

  if (normalizedTeamName.toUpperCase() === normalizedTeamA.toUpperCase()) {
    return teamA;
  }

  if (normalizedTeamName.toUpperCase() === normalizedTeamB.toUpperCase()) {
    return teamB;
  }

  throw new Error('Penalty winner must be one of the participating teams.');
};

module.exports = {
  validatePenaltyWinner,
};
