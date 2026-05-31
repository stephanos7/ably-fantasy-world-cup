import { DEFAULT_SCORING_RULES } from "@ably-fantasy-world-cup/shared/scoring-rules";
import { calculatePlayerEventPoints } from "./calculate-player-event-points.js";

export function calculateTeamDeltaForEvent({
  event,
  teamPlayers,
  scoringRules = DEFAULT_SCORING_RULES
}) {
  const teamPlayer = teamPlayers.find(
    (player) => player.playerId === event.playerId
  );

  if (!teamPlayer) {
    return 0;
  }

  const points = calculatePlayerEventPoints({
    eventType: event.eventType,
    scoringRules
  });

  if (teamPlayer.isCaptain) {
    return points * scoringRules.captainMultiplier;
  }

  return points;
}

export function calculateTeamDeltas({
  event,
  fantasyTeams,
  scoringRules = DEFAULT_SCORING_RULES
}) {
  return fantasyTeams
    .map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      pointsDelta: calculateTeamDeltaForEvent({
        event,
        teamPlayers: team.players,
        scoringRules
      })
    }))
    .filter((teamDelta) => teamDelta.pointsDelta !== 0);
}

