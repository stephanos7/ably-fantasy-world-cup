export function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Set it to your Neon Postgres connection string, including sslmode=require."
    );
  }

  return databaseUrl;
}

export function describeDatabaseTarget(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      database: url.pathname.replace(/^\//, "") || "(default)"
    };
  } catch {
    return {
      host: "(invalid DATABASE_URL)",
      database: "(unknown)"
    };
  }
}
