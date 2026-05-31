export function rankLeaderboard({ entries }) {
  return [...entries]
    .sort((left, right) => {
      const pointsDifference = right.totalPoints - left.totalPoints;

      if (pointsDifference !== 0) {
        return pointsDifference;
      }

      return left.teamName.localeCompare(right.teamName);
    })
    .map((entry, index) => {
      const rank = index + 1;
      const previousRank = entry.previousRank ?? entry.rank;
      const rankedEntry = {
        ...entry,
        rank
      };

      if (previousRank !== undefined) {
        rankedEntry.previousRank = previousRank;
        rankedEntry.rankDelta = previousRank - rank;
      }

      return rankedEntry;
    });
}
