import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createDatabasePool } from "./db/pool.js";
import { postSimulatorEvent as processSimulatorEvent } from "./http/simulator.js";
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
  return {
    async expect(expectedStatus) {
      try {
        const result = await processSimulatorEvent(pool, body);
        assert.equal(expectedStatus, 201);
        return { body: result };
      } catch (error) {
        assert.equal(error.status ?? 500, expectedStatus);
        return { body: { ok: false, error: error.message } };
      }
    }
  };
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
  });

  afterEach(async () => {
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
      [
        "league:friends:teams",
        "league:friends:teams",
        "league:friends:teams"
      ]
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
      outboxRows.some(
        (row) =>
          row.channel === "league:friends:teams" &&
          row.name === "team.updated" &&
          row.data.userSlug === "maria"
      ),
      false
    );
  });

  it("emits complete LiveSync model updates for one simulator mutation", async () => {
    const response = await postSimulatorEvent({
      matchSlug: "france-england",
      eventType: "goal",
      playerSlug: "mbappe",
      minute: 72
    }).expect(201);

    const outboxRows = await getOutboxRows();
    const mutationId = `simulator:${response.body.event.id}`;

    assert.equal(outboxRows.length, 6);
    assert.deepEqual(
      response.body.outboxMessages.map((message) => ({
        hasSequenceId: typeof message.sequenceId === "number",
        channel: message.channel,
        name: message.name
      })),
      outboxRows.map((row) => ({
        hasSequenceId: true,
        channel: row.channel,
        name: row.name
      }))
    );
    assert.deepEqual(
      [...new Set(outboxRows.map((row) => row.mutationId))],
      [mutationId]
    );
    assert.deepEqual(
      outboxRows
        .map((row) => `${row.channel} / ${row.name}`)
        .sort(),
      [
        "league:friends:activity / activity.created",
        "league:friends:leaderboard / leaderboard.updated",
        "league:friends:teams / team.updated",
        "league:friends:teams / team.updated",
        "league:friends:teams / team.updated",
        "match:france-england / match.updated"
      ]
    );

    const rowsByEvent = new Map(
      outboxRows.map((row) => [`${row.channel}:${row.name}`, row])
    );
    const leaderboardRow = rowsByEvent.get(
      "league:friends:leaderboard:leaderboard.updated"
    );
    const activityRow = rowsByEvent.get(
      "league:friends:activity:activity.created"
    );
    const teamRows = outboxRows.filter(
      (row) =>
        row.channel === "league:friends:teams" && row.name === "team.updated"
    );
    const stephanosTeamRow = teamRows.find(
      (row) => row.data.userSlug === "stephanos"
    );
    const matchRow = rowsByEvent.get("match:france-england:match.updated");

    assert.ok(leaderboardRow);
    assert.ok(activityRow);
    assert.ok(stephanosTeamRow);
    assert.ok(matchRow);
    assert.deepEqual(
      teamRows.map((row) => row.data.userSlug).sort(),
      ["andreas", "stephanos", "theo"]
    );
    assert.equal(
      teamRows.some((row) => row.data.userSlug === "maria"),
      false
    );

    assert.equal(leaderboardRow.data.leagueSlug, "friends");
    assert.equal(Array.isArray(leaderboardRow.data.leaderboard), true);
    assert.equal(
      leaderboardRow.data.leaderboard.some(
        (entry) =>
          entry.teamSlug === "stephanos-heroes" &&
          entry.points === 62 &&
          entry.rank === 1
      ),
      true
    );

    assert.equal(activityRow.data.leagueSlug, "friends");
    assert.equal(Array.isArray(activityRow.data.items), true);
    assert.equal(activityRow.data.items.length, 3);
    assert.equal(
      activityRow.data.items.some(
        (item) =>
          item.teamSlug === "stephanos-heroes" &&
          item.userSlug === "stephanos" &&
          item.pointsDelta === 10 &&
          item.matchSlug === "france-england" &&
          item.minute === 72
      ),
      true
    );

    assert.deepEqual(stephanosTeamRow.data, {
      userSlug: "stephanos",
      teamSlug: "stephanos-heroes",
      teamName: "Stephanos Heroes",
      points: 62,
      rank: 1,
      lastEvent: {
        eventType: "goal",
        playerSlug: "mbappe",
        playerName: "Kylian Mbappé",
        pointsDelta: 10,
        minute: 72
      }
    });

    assert.deepEqual(matchRow.data, {
      matchSlug: "france-england",
      lastEvent: {
        eventType: "goal",
        playerSlug: "mbappe",
        playerName: "Kylian Mbappé",
        minute: 72
      }
    });
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
