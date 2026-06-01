import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createDatabasePool } from "./db/pool.js";
import { postSimulatorEvent } from "./http/simulator.js";
import {
  getClientTeam,
  getLeagueActivity,
  getLeagueLeaderboard,
  getMatch
} from "./http/read-models.js";
import { runReset } from "../../db/scripts/reset.js";

const databaseUrl = process.env.TEST_DATABASE_URL;

async function canConnectToDatabase() {
  if (!databaseUrl) {
    return false;
  }

  const pool = createDatabasePool({ databaseUrl });

  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

const hasDatabase = await canConnectToDatabase();
let pool;

describe("read model API", { skip: !hasDatabase }, () => {
  beforeEach(async () => {
    process.env.ALLOW_DB_RESET = "true";
    await runReset({ seed: true, databaseUrl });
    pool = createDatabasePool({ databaseUrl });
  });

  afterEach(async () => {
    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  it("GET /api/leagues/:leagueSlug/leaderboard returns backend-ranked standings", async () => {
    const response = await getLeagueLeaderboard(pool, { leagueSlug: "friends" });

    assert.deepEqual(response.league, {
      slug: "friends",
      name: "Friends League"
    });
    assert.deepEqual(
      response.leaderboard.map((entry) => ({
        rank: entry.rank,
        teamSlug: entry.teamSlug,
        points: entry.points
      })),
      [
        { rank: 1, teamSlug: "stephanos-heroes", points: 52 },
        { rank: 2, teamSlug: "maria-mavericks", points: 47 },
        { rank: 3, teamSlug: "andreas-attackers", points: 41 },
        { rank: 4, teamSlug: "theo-tacticians", points: 36 }
      ]
    );
  });

  it("GET /api/leagues/:leagueSlug/activity returns recent activity", async () => {
    const response = await getLeagueActivity(pool, { leagueSlug: "friends" });

    assert.equal(response.leagueSlug, "friends");
    assert.equal(response.items.length, 1);
    assert.equal(response.items[0].message, "Welcome to the Friends League!");
    assert.deepEqual(response.items[0].payload, { tag: "seed" });
  });

  it("GET /api/clients/:userSlug/team returns team state and squad", async () => {
    const response = await getClientTeam(pool, { userSlug: "stephanos" });

    assert.deepEqual(response.user, {
      slug: "stephanos",
      name: "Stephanos"
    });
    assert.equal(response.team.slug, "stephanos-heroes");
    assert.equal(response.team.points, 52);
    assert.equal(response.team.rank, 1);
    assert.deepEqual(
      response.squad.map((player) => ({
        slug: player.slug,
        isCaptain: player.isCaptain
      })),
      [
        { slug: "mbappe", isCaptain: true },
        { slug: "bellingham", isCaptain: false },
        { slug: "kane", isCaptain: false }
      ]
    );
  });

  it("GET /api/matches/:matchSlug returns match summary and events", async () => {
    await postSimulatorEvent(pool, {
      matchSlug: "france-england",
      eventType: "goal",
      playerSlug: "mbappe",
      minute: 72
    });

    const response = await getMatch(pool, { matchSlug: "france-england" });

    assert.equal(response.match.slug, "france-england");
    assert.equal(response.match.homeTeam, "France");
    assert.equal(response.match.awayTeam, "England");
    assert.equal(response.events.length, 1);
    assert.deepEqual(
      {
        eventType: response.events[0].eventType,
        minute: response.events[0].minute,
        playerSlug: response.events[0].playerSlug
      },
      {
        eventType: "goal",
        minute: 72,
        playerSlug: "mbappe"
      }
    );
  });

  it("returns 404 for unknown slugs", async () => {
    await assert.rejects(
      () => getLeagueLeaderboard(pool, { leagueSlug: "unknown" }),
      /Unknown leagueSlug/
    );
    await assert.rejects(
      () => getLeagueActivity(pool, { leagueSlug: "unknown" }),
      /Unknown leagueSlug/
    );
    await assert.rejects(
      () => getClientTeam(pool, { userSlug: "unknown" }),
      /Unknown userSlug/
    );
    await assert.rejects(
      () => getMatch(pool, { matchSlug: "unknown" }),
      /Unknown matchSlug/
    );
  });
});
