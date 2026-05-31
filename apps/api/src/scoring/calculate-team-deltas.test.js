import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateTeamDeltaForEvent,
  calculateTeamDeltas
} from "./calculate-team-deltas.js";

describe("calculateTeamDeltaForEvent", () => {
  it("applies the captain multiplier to positive events", () => {
    const pointsDelta = calculateTeamDeltaForEvent({
      event: { playerId: "player-1", eventType: "goal" },
      teamPlayers: [{ playerId: "player-1", isCaptain: true }]
    });

    assert.equal(pointsDelta, 10);
  });

  it("applies the captain multiplier to negative events", () => {
    const pointsDelta = calculateTeamDeltaForEvent({
      event: { playerId: "player-1", eventType: "yellow_card" },
      teamPlayers: [{ playerId: "player-1", isCaptain: true }]
    });

    assert.equal(pointsDelta, -2);
  });

  it("scores normal assists without the captain multiplier", () => {
    const pointsDelta = calculateTeamDeltaForEvent({
      event: { playerId: "player-1", eventType: "assist" },
      teamPlayers: [{ playerId: "player-1", isCaptain: false }]
    });

    assert.equal(pointsDelta, 3);
  });

  it("returns zero when the team does not own the event player", () => {
    const pointsDelta = calculateTeamDeltaForEvent({
      event: { playerId: "player-1", eventType: "goal" },
      teamPlayers: [{ playerId: "player-2", isCaptain: true }]
    });

    assert.equal(pointsDelta, 0);
  });
});

describe("calculateTeamDeltas", () => {
  it("excludes unaffected teams", () => {
    const deltas = calculateTeamDeltas({
      event: { playerId: "player-1", eventType: "goal" },
      fantasyTeams: [
        {
          teamId: "team-1",
          teamName: "Owners",
          players: [{ playerId: "player-1", isCaptain: false }]
        },
        {
          teamId: "team-2",
          teamName: "Unaffected",
          players: [{ playerId: "player-2", isCaptain: false }]
        }
      ]
    });

    assert.deepEqual(deltas, [
      { teamId: "team-1", teamName: "Owners", pointsDelta: 5 }
    ]);
  });

  it("scores multiple fantasy teams that own the same player", () => {
    const deltas = calculateTeamDeltas({
      event: { playerId: "player-1", eventType: "assist" },
      fantasyTeams: [
        {
          teamId: "team-1",
          teamName: "Captain Owners",
          players: [{ playerId: "player-1", isCaptain: true }]
        },
        {
          teamId: "team-2",
          teamName: "Normal Owners",
          players: [{ playerId: "player-1", isCaptain: false }]
        }
      ]
    });

    assert.deepEqual(deltas, [
      { teamId: "team-1", teamName: "Captain Owners", pointsDelta: 6 },
      { teamId: "team-2", teamName: "Normal Owners", pointsDelta: 3 }
    ]);
  });
});

