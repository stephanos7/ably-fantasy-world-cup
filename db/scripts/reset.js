import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { runMigrations } from "./migrate.js";
import { runSeed } from "./seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const requireFromApi = createRequire(
  path.resolve(__dirname, "..", "..", "apps", "api", "package.json")
);
const dotenv = requireFromApi("dotenv");
const { Pool } = requireFromApi("pg");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/ably_fantasy_world_cup";

function createPool() {
  return new Pool({ connectionString: databaseUrl });
}

function shouldAllowReset() {
  const env = process.env.NODE_ENV ?? "development";
  const allowDbReset =
    process.env.ALLOW_DB_RESET === "true" || process.env.ALLOW_DB_RESET === "1";

  if (env === "production" && !allowDbReset) {
    return false;
  }

  return true;
}

export async function runReset({ seed = false } = {}) {
  if (!shouldAllowReset()) {
    throw new Error(
      "Database reset is not allowed in production without ALLOW_DB_RESET=true. Set NODE_ENV to a non-production value or export ALLOW_DB_RESET=true."
    );
  }

  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("COMMIT");

    console.log("Schema reset; running migrations...");
    await runMigrations();

    if (seed) {
      console.log("Seeding after reset...");
      await runSeed();
    }

    console.log("Database reset complete.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] === __filename) {
  const seed = process.argv.includes("--seed");
  runReset({ seed })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Reset failed:", error);
      process.exit(1);
    });
}
