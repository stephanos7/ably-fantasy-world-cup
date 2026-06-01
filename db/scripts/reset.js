import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { runMigrations } from "./migrate.js";
import { runSeed } from "./seed.js";
import { createDatabasePool } from "../../apps/api/src/db/pool.js";
import { describeDatabaseTarget, requireDatabaseUrl } from "./database-url.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const requireFromApi = createRequire(
  path.resolve(__dirname, "..", "..", "apps", "api", "package.json")
);
const dotenv = requireFromApi("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

function createPool(databaseUrl) {
  return createDatabasePool({ databaseUrl });
}

function shouldAllowReset() {
  const env = process.env.NODE_ENV ?? "development";
  const allowDbReset =
    process.env.ALLOW_DB_RESET === "true" || process.env.ALLOW_DB_RESET === "1";

  if (env === "production") {
    return false;
  }

  return allowDbReset;
}

export async function runReset({
  seed = false,
  databaseUrl = requireDatabaseUrl()
} = {}) {
  if (!shouldAllowReset()) {
    throw new Error(
      "Database reset is not allowed. Reset refuses NODE_ENV=production and requires ALLOW_DB_RESET=true for hosted database safety."
    );
  }

  const target = describeDatabaseTarget(databaseUrl);
  console.log(`Reset target: ${target.host}/${target.database}`);

  const pool = createPool(databaseUrl);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("COMMIT");

    console.log("Schema reset; running migrations...");
    await runMigrations({ databaseUrl });

    if (seed) {
      console.log("Seeding after reset...");
      await runSeed({ databaseUrl });
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
