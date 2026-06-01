# Scoring

Fantasy scoring is owned by the backend. The frontend can display scores and ranks, but it must not calculate official score or leaderboard truth.

Supported match events:

| Event | Points |
| --- | ---: |
| `goal` | `+5` |
| `assist` | `+3` |
| `yellow_card` | `-1` |

Captains use a `2x` multiplier. For example, a captain goal is worth `+10`, a captain assist is worth `+6`, and a captain yellow card is worth `-2`.

Team deltas are calculated only for fantasy teams that own the event player. If multiple fantasy teams own the same real player, each team receives its own score delta.

Leaderboard ranking sorts by `totalPoints` descending. If teams are tied, `teamName` is sorted alphabetically. Ranked entries include `rank`, `previousRank` when supplied, and `rankDelta`; positive `rankDelta` means the team moved up, negative means it moved down, and zero means it stayed in place.

