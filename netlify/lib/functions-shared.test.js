import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getParam } from "./functions-shared.js";

describe("getParam", () => {
  it("prefers queryStringParameters", () => {
    const event = {
      queryStringParameters: { leagueSlug: "friends" },
      path: "/api/leagues/activity"
    };

    assert.equal(getParam(event, "leagueSlug"), "friends");
  });

  it("extracts leagueSlug from /api/leagues/friends/activity", () => {
    const event = {
      path: "/api/leagues/friends/activity"
    };

    assert.equal(getParam(event, "leagueSlug"), "friends");
  });

  it("extracts leagueSlug from /api/leagues/friends/leaderboard", () => {
    const event = {
      path: "/api/leagues/friends/leaderboard"
    };

    assert.equal(getParam(event, "leagueSlug"), "friends");
  });

  it("extracts userSlug from /api/clients/stephanos/team", () => {
    const event = {
      path: "/api/clients/stephanos/team"
    };

    assert.equal(getParam(event, "userSlug"), "stephanos");
  });

  it("extracts matchSlug from /api/matches/france-england", () => {
    const event = {
      path: "/api/matches/france-england"
    };

    assert.equal(getParam(event, "matchSlug"), "france-england");
  });
});
