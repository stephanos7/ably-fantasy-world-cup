import { Pool } from "pg";

export function createDatabasePool({ databaseUrl }) {
  return new Pool(createPoolConfig({ databaseUrl }));
}

export function createPoolConfig({ databaseUrl }) {
  const config = { connectionString: databaseUrl };
  const ssl = getSslConfig(databaseUrl);

  if (ssl) {
    config.ssl = ssl;
  }

  return config;
}

function getSslConfig(databaseUrl) {
  try {
    const parsedUrl = new URL(databaseUrl);
    const sslMode = parsedUrl.searchParams.get("sslmode");

    if (["require", "verify-ca", "verify-full"].includes(sslMode)) {
      return true;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
