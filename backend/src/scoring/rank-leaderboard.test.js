import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankLeaderboard } from "./rank-leaderboard.js";

describe("rankLeaderboard", () => {
  it("ranks entries by total points descending", () => {
    const ranked = rankLeaderboard({
      entries: [
        { teamId: "team-1", teamName: "Low", totalPoints: 10 },
        { teamId: "team-2", teamName: "High", totalPoints: 20 }
      ]
    });

    assert.deepEqual(
      ranked.map((entry) => ({ teamName: entry.teamName, rank: entry.rank })),
      [
        { teamName: "High", rank: 1 },
        { teamName: "Low", rank: 2 }
      ]
    );
  });

  it("breaks point ties by team name alphabetically", () => {
    const ranked = rankLeaderboard({
      entries: [
        { teamId: "team-2", teamName: "Zulu", totalPoints: 20 },
        { teamId: "team-1", teamName: "Alpha", totalPoints: 20 }
      ]
    });

    assert.deepEqual(
      ranked.map((entry) => entry.teamName),
      ["Alpha", "Zulu"]
    );
  });

  it("calculates rankDelta from previous rank", () => {
    const ranked = rankLeaderboard({
      entries: [
        { teamId: "team-1", teamName: "Moved Down", totalPoints: 20, rank: 1 },
        { teamId: "team-2", teamName: "Moved Up", totalPoints: 30, rank: 2 },
        { teamId: "team-3", teamName: "Same", totalPoints: 10, rank: 3 }
      ]
    });

    assert.deepEqual(
      ranked.map((entry) => ({
        teamName: entry.teamName,
        rank: entry.rank,
        previousRank: entry.previousRank,
        rankDelta: entry.rankDelta
      })),
      [
        {
          teamName: "Moved Up",
          rank: 1,
          previousRank: 2,
          rankDelta: 1
        },
        {
          teamName: "Moved Down",
          rank: 2,
          previousRank: 1,
          rankDelta: -1
        },
        {
          teamName: "Same",
          rank: 3,
          previousRank: 3,
          rankDelta: 0
        }
      ]
    );
  });
});

