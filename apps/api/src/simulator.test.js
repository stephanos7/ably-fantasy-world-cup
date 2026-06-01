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

function postSimulatorEvent(body) {
  return request(app).post("/api/simulator/events").send(body);
}

async function countRows(tableName) {
  const { rows } = await pool.query(`SELECT count(*)::int AS count FROM ${tableName}`);
  return rows[0].count;
}

async function getOutboxRows() {
  const { rows } = await pool.query(
    `SELECT sequence_id AS "sequenceId",
            mutation_id AS "mutationId",
            channel,
            name,
            rejected,
            data,
            headers,
            locked_by AS "lockedBy",
            lock_expiry AS "lockExpiry",
            processed
     FROM outbox
     ORDER BY sequence_id`
  );

  return rows;
}

describe("POST /api/simulator/events", { skip: !hasDatabase }, () => {
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

  it("persists a Mbappe goal and writes derived fantasy state", async () => {
    const response = await postSimulatorEvent({
      matchSlug: "france-england",
      eventType: "goal",
      playerSlug: "mbappe",
      minute: 72
    }).expect(201);

    assert.equal(response.body.ok, true);
    assert.equal(response.body.event.matchSlug, "france-england");
    assert.equal(response.body.event.eventType, "goal");
    assert.equal(response.body.event.playerSlug, "mbappe");
    assert.equal(response.body.event.minute, 72);

    const { rows: matchEvents } = await pool.query(
      `SELECT match_events.event_type AS "eventType",
              match_events.event_time AS minute,
              matches.slug AS "matchSlug",
              players.slug AS "playerSlug"
       FROM match_events
       JOIN matches ON matches.id = match_events.match_id
       JOIN players ON players.id = match_events.player_id`
    );
    assert.deepEqual(matchEvents, [
      {
        eventType: "goal",
        minute: 72,
        matchSlug: "france-england",
        playerSlug: "mbappe"
      }
    ]);

    const { rows: scores } = await pool.query(
      `SELECT fantasy_teams.slug AS "teamSlug",
              fantasy_team_scores.score
       FROM fantasy_team_scores
       JOIN fantasy_teams
         ON fantasy_teams.id = fantasy_team_scores.fantasy_team_id
       ORDER BY fantasy_teams.slug`
    );
    assert.deepEqual(scores, [
      { teamSlug: "andreas-attackers", score: 5 },
      { teamSlug: "stephanos-heroes", score: 10 },
      { teamSlug: "theo-tacticians", score: 5 }
    ]);

    const { rows: leaderboard } = await pool.query(
      `SELECT fantasy_teams.slug AS "teamSlug",
              leaderboard_entries.rank,
              leaderboard_entries.points
       FROM leaderboard_entries
       JOIN fantasy_teams
         ON fantasy_teams.id = leaderboard_entries.fantasy_team_id
       ORDER BY leaderboard_entries.rank`
    );
    assert.deepEqual(leaderboard, [
      { teamSlug: "stephanos-heroes", rank: 1, points: 62 },
      { teamSlug: "maria-mavericks", rank: 2, points: 47 },
      { teamSlug: "andreas-attackers", rank: 3, points: 46 },
      { teamSlug: "theo-tacticians", rank: 4, points: 41 }
    ]);

    assert.equal(await countRows("activity_feed"), 4);

    const outboxRows = await getOutboxRows();
    assert.equal(outboxRows[0].channel, "league:friends:leaderboard");
    assert.equal(outboxRows[1].channel, "league:friends:activity");
    assert.equal(outboxRows.at(-1).channel, "match:france-england");
    assert.deepEqual(
      outboxRows
        .slice(2, -1)
        .map((row) => row.channel)
        .sort(),
      ["team:andreas", "team:stephanos", "team:theo"]
    );
  });

  it("applies the captain multiplier", async () => {
    const response = await postSimulatorEvent({
      matchSlug: "france-england",
      eventType: "goal",
      playerSlug: "mbappe",
      minute: 72
    }).expect(201);

    const stephanos = response.body.affectedTeams.find(
      (team) => team.teamSlug === "stephanos-heroes"
    );

    assert.equal(stephanos.pointsDelta, 10);
    assert.equal(stephanos.totalPoints, 62);
  });

  it("does not update teams that do not own the event player", async () => {
    const response = await postSimulatorEvent({
      matchSlug: "france-england",
      eventType: "goal",
      playerSlug: "mbappe",
      minute: 72
    }).expect(201);

    assert.equal(
      response.body.affectedTeams.some(
        (team) => team.teamSlug === "maria-mavericks"
      ),
      false
    );

    const outboxRows = await getOutboxRows();
    assert.equal(
      outboxRows.some((row) => row.channel === "team:maria"),
      false
    );
  });

  it("scores assist events", async () => {
    const response = await postSimulatorEvent({
      matchSlug: "france-england",
      eventType: "assist",
      playerSlug: "mbappe",
      minute: 54
    }).expect(201);

    assert.deepEqual(
      response.body.affectedTeams
        .map((team) => ({
          teamSlug: team.teamSlug,
          pointsDelta: team.pointsDelta
        }))
        .sort((left, right) => left.teamSlug.localeCompare(right.teamSlug)),
      [
        { teamSlug: "andreas-attackers", pointsDelta: 3 },
        { teamSlug: "stephanos-heroes", pointsDelta: 6 },
        { teamSlug: "theo-tacticians", pointsDelta: 3 }
      ]
    );
  });

  it("scores yellow-card events", async () => {
    const response = await postSimulatorEvent({
      matchSlug: "france-england",
      eventType: "yellow_card",
      playerSlug: "mbappe",
      minute: 21
    }).expect(201);

    assert.deepEqual(
      response.body.affectedTeams
        .map((team) => ({
          teamSlug: team.teamSlug,
          pointsDelta: team.pointsDelta
        }))
        .sort((left, right) => left.teamSlug.localeCompare(right.teamSlug)),
      [
        { teamSlug: "andreas-attackers", pointsDelta: -1 },
        { teamSlug: "stephanos-heroes", pointsDelta: -2 },
        { teamSlug: "theo-tacticians", pointsDelta: -1 }
      ]
    );
  });

  it("rolls back when the player is unknown", async () => {
    await postSimulatorEvent({
      matchSlug: "france-england",
      eventType: "goal",
      playerSlug: "unknown-player",
      minute: 72
    }).expect(404);

    assert.equal(await countRows("match_events"), 0);
    assert.equal(await countRows("outbox"), 0);
  });

  it("writes outbox rows with only application-owned fields set by the app", async () => {
    await postSimulatorEvent({
      matchSlug: "france-england",
      eventType: "goal",
      playerSlug: "mbappe",
      minute: 72
    }).expect(201);

    const outboxRows = await getOutboxRows();
    assert.equal(outboxRows.length, 6);

    for (const row of outboxRows) {
      assert.match(row.mutationId, /^simulator:/);
      assert.equal(typeof row.sequenceId, "number");
      assert.equal(row.rejected, false);
      assert.equal(row.lockedBy, null);
      assert.equal(row.lockExpiry, null);
      assert.equal(row.processed, false);
      assert.equal(typeof row.channel, "string");
      assert.equal(typeof row.name, "string");
      assert.equal(typeof row.data, "object");
      assert.deepEqual(row.headers, {});
    }

    assert.equal(
      new Set(outboxRows.map((row) => row.mutationId)).size,
      1
    );
  });

  it("allows repeated identical simulator events", async () => {
    const eventBody = {
      matchSlug: "france-england",
      eventType: "goal",
      playerSlug: "mbappe",
      minute: 72
    };

    await postSimulatorEvent(eventBody).expect(201);
    await postSimulatorEvent(eventBody).expect(201);

    assert.equal(await countRows("match_events"), 2);
    assert.equal(await countRows("outbox"), 12);
    assert.equal(await countRows("activity_feed"), 7);
  });
});
