import { z } from "zod";
import { APP_NAME } from "@ably-fantasy-world-cup/shared";

const optionalEnvString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

export const envSchema = z.object({
  DATABASE_URL: optionalEnvString,
  ABLY_API_KEY: optionalEnvString,
  NODE_ENV: z.string().optional()
});

export function assertRuntimeEnv(runtimeEnv = process.env) {
  const parsed = envSchema.parse(runtimeEnv);
  const missing = [];

  if (!parsed.DATABASE_URL) {
    missing.push("DATABASE_URL");
  }

  if (!parsed.ABLY_API_KEY) {
    missing.push("ABLY_API_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `${missing.join(", ")} required. Configure Neon Postgres and Ably LiveSync before starting Netlify Functions.`
    );
  }
}

export function describeDatabaseTarget(databaseUrl) {
  if (!databaseUrl) {
    return null;
  }

  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      database: url.pathname.replace(/^\//, "") || null,
      sslMode: url.searchParams.get("sslmode") ?? null
    };
  } catch {
    return {
      host: null,
      database: null,
      sslMode: null
    };
  }
}

export function getHealthResponse(env = process.env) {
  const parsed = envSchema.parse(env);

  return {
    ok: true,
    service: APP_NAME,
    databaseConfigured: Boolean(parsed.DATABASE_URL),
    ablyConfigured: Boolean(parsed.ABLY_API_KEY),
    livesyncMode: "required"
  };
}

export function getConfigResponse(env = process.env) {
  const parsed = envSchema.parse(env);

  return {
    ok: true,
    service: APP_NAME,
    environment: parsed.NODE_ENV ?? "development",
    database: {
      configured: Boolean(parsed.DATABASE_URL),
      target: describeDatabaseTarget(parsed.DATABASE_URL)
    },
    ably: {
      configured: Boolean(parsed.ABLY_API_KEY)
    },
    livesync: {
      mode: "required"
    }
  };
}
