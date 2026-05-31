import { Pool } from "pg";

export function createDatabasePool({ databaseUrl }) {
  return new Pool({ connectionString: databaseUrl });
}
