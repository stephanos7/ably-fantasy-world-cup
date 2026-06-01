import { DEFAULT_SCORING_RULES } from "@ably-fantasy-world-cup/shared/scoring-rules";

export function calculatePlayerEventPoints({
  eventType,
  scoringRules = DEFAULT_SCORING_RULES
}) {
  return scoringRules.eventPoints[eventType] ?? 0;
}

