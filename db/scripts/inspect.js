import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { createDatabasePool } from "../../backend/src/db/pool.js";
import { describeDatabaseTarget, requireDatabaseUrl } from "./database-url.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function objectExists(client, { tableName, routineName }) {
  if (tableName) {
    const { rows } = await client.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = $1
       ) AS exists`,
      [tableName]
    );
    return rows[0].exists;
  }

  const { rows } = await client.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.routines
       WHERE routine_schema = 'public'
         AND routine_name = $1
     ) AS exists`,
    [routineName]
  );
  return rows[0].exists;
}

async function triggerExists(client, triggerName) {
  const { rows } = await client.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.triggers
       WHERE trigger_schema = 'public'
         AND trigger_name = $1
     ) AS exists`,
    [triggerName]
  );
  return rows[0].exists;
}

async function countRows(client, tableName) {
  const exists = await objectExists(client, { tableName });
  if (!exists) {
    return null;
  }

  const { rows } = await client.query(`SELECT count(*)::int AS count FROM ${tableName}`);
  return rows[0].count;
}

export async function runInspect() {
  const databaseUrl = requireDatabaseUrl();
  const target = describeDatabaseTarget(databaseUrl);
  const pool = createDatabasePool({ databaseUrl });
  const client = await pool.connect();

  try {
    const checks = {
      outbox: await objectExists(client, { tableName: "outbox" }),
      nodes: await objectExists(client, { tableName: "nodes" }),
      outboxNotify: await objectExists(client, { routineName: "outbox_notify" }),
      publicOutboxTrigger: await triggerExists(client, "public_outbox_trigger")
    };

    const hasMatchesTable = await objectExists(client, { tableName: "matches" });
    const matchRow = hasMatchesTable
      ? (
          await client.query(
            `SELECT EXISTS (
               SELECT 1
               FROM matches
               WHERE slug = 'france-england'
             ) AS exists`
          )
        ).rows[0]
      : { exists: false };

    const counts = {};
    for (const tableName of [
      "users",
      "matches",
      "fantasy_teams",
      "leaderboard_entries"
    ]) {
      counts[tableName] = await countRows(client, tableName);
    }

    console.log(
      JSON.stringify(
        {
          target,
          livesyncObjects: checks,
          seededDemo: {
            franceEnglandMatch: matchRow.exists
          },
          counts
        },
        null,
        2
      )
    );
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] === __filename) {
  runInspect()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Inspect failed:", error);
      process.exit(1);
    });
}
