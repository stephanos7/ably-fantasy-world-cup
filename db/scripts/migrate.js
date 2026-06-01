import { promises as fs } from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { createDatabasePool } from "../../apps/api/src/db/pool.js";
import { describeDatabaseTarget, requireDatabaseUrl } from "./database-url.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const requireFromApi = createRequire(
  path.resolve(__dirname, "..", "..", "apps", "api", "package.json")
);
const dotenv = requireFromApi("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const migrationsDir = path.resolve(__dirname, "..", "migrations");
function createPool(databaseUrl) {
  return createDatabasePool({ databaseUrl });
}

export async function runMigrations({ databaseUrl = requireDatabaseUrl() } = {}) {
  const target = describeDatabaseTarget(databaseUrl);
  console.log(`Migration target: ${target.host}/${target.database}`);

  const pool = createPool(databaseUrl);
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        run_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log(`No migration files found in ${migrationsDir}`);
      return;
    }

    const { rows } = await client.query(`SELECT name FROM schema_migrations`);
    const applied = new Set(rows.map((row) => row.name));
    const pending = files.filter((file) => !applied.has(file));

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    for (const file of pending) {
      const filePath = path.resolve(migrationsDir, file);
      const sql = await fs.readFile(filePath, "utf8");
      console.log(`Applying migration ${file}`);
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
        file
      ]);
      await client.query("COMMIT");
    }

    console.log(`Applied ${pending.length} migration(s).`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
