import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { app } from "./server.js";
import { createDatabasePool } from "./db/pool.js";
import { runReset } from "../../../db/scripts/reset.js";

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
    app.locals.db = pool;
  });

  afterEach(async () => {
    delete app.locals.db;

    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  it("GET /api/leagues/:leagueSlug/leaderboard returns backend-ranked standings", async () => {
    const response = await request(app)
      .get("/api/leagues/friends/leaderboard")
      .expect(200);

    assert.deepEqual(response.body.league, {
      slug: "friends",
      name: "Friends League"
    });
    assert.deepEqual(
      response.body.leaderboard.map((entry) => ({
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
    const response = await request(app)
      .get("/api/leagues/friends/activity")
      .expect(200);

    assert.equal(response.body.leagueSlug, "friends");
    assert.equal(response.body.items.length, 1);
    assert.equal(response.body.items[0].message, "Welcome to the Friends League!");
    assert.deepEqual(response.body.items[0].payload, { tag: "seed" });
  });

  it("GET /api/clients/:userSlug/team returns team state and squad", async () => {
    const response = await request(app)
      .get("/api/clients/stephanos/team")
      .expect(200);

    assert.deepEqual(response.body.user, {
      slug: "stephanos",
      name: "Stephanos"
    });
    assert.equal(response.body.team.slug, "stephanos-heroes");
    assert.equal(response.body.team.points, 52);
    assert.equal(response.body.team.rank, 1);
    assert.deepEqual(
      response.body.squad.map((player) => ({
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
    await request(app)
      .post("/api/simulator/events")
      .send({
        matchSlug: "france-england",
        eventType: "goal",
        playerSlug: "mbappe",
        minute: 72
      })
      .expect(201);

    const response = await request(app)
      .get("/api/matches/france-england")
      .expect(200);

    assert.equal(response.body.match.slug, "france-england");
    assert.equal(response.body.match.homeTeam, "France");
    assert.equal(response.body.match.awayTeam, "England");
    assert.equal(response.body.events.length, 1);
    assert.deepEqual(
      {
        eventType: response.body.events[0].eventType,
        minute: response.body.events[0].minute,
        playerSlug: response.body.events[0].playerSlug
      },
      {
        eventType: "goal",
        minute: 72,
        playerSlug: "mbappe"
      }
    );
  });

  it("returns 404 for unknown slugs", async () => {
    await request(app).get("/api/leagues/unknown/leaderboard").expect(404);
    await request(app).get("/api/leagues/unknown/activity").expect(404);
    await request(app).get("/api/clients/unknown/team").expect(404);
    await request(app).get("/api/matches/unknown").expect(404);
  });
});
