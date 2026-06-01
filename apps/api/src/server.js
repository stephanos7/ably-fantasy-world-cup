import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { APP_NAME } from "@ably-fantasy-world-cup/shared";
import { fileURLToPath } from "node:url";
import { createDatabasePool } from "./db/pool.js";
import { createAblyTokenRouter } from "./routes/ably-token.js";
import { createSimulatorRouter } from "./routes/simulator.js";
import { createReadModelsRouter } from "./routes/read-models.js";

const optionalEnvString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().optional(),
  DATABASE_URL: optionalEnvString,
  ABLY_API_KEY: optionalEnvString,
  NODE_ENV: z.string().optional()
});

const env = envSchema.parse(process.env);
const isTest = env.NODE_ENV === "test";
const app = express();

function assertRuntimeEnv(runtimeEnv = env) {
  const missing = [];

  if (!runtimeEnv.DATABASE_URL) {
    missing.push("DATABASE_URL");
  }

  if (!runtimeEnv.ABLY_API_KEY) {
    missing.push("ABLY_API_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `${missing.join(", ")} required. Configure Neon Postgres and Ably LiveSync before starting the API.`
    );
  }
}

function describeDatabaseTarget(databaseUrl) {
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

if (!isTest) {
  assertRuntimeEnv();
}

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  if (req.method !== "GET" && req.body && Object.keys(req.body).length > 0) {
    console.log("Request body:", JSON.stringify(req.body));
  }
  next();
});

if (env.DATABASE_URL) {
  app.locals.db = createDatabasePool({ databaseUrl: env.DATABASE_URL });
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: APP_NAME,
    databaseConfigured: Boolean(env.DATABASE_URL),
    ablyConfigured: Boolean(env.ABLY_API_KEY),
    livesyncMode: "required"
  });
});

app.get("/api/config", (_req, res) => {
  res.json({
    ok: true,
    service: APP_NAME,
    environment: process.env.NODE_ENV ?? "development",
    database: {
      configured: Boolean(env.DATABASE_URL),
      target: describeDatabaseTarget(env.DATABASE_URL)
    },
    ably: {
      configured: Boolean(env.ABLY_API_KEY)
    },
    livesync: {
      mode: "required"
    }
  });
});

app.post("/api/demo/reset", (_req, res) => {
  res
    .status(501)
    .json({ ok: false, error: "Demo reset is not implemented yet" });
});

app.use("/api/simulator", createSimulatorRouter());
app.use("/api", createAblyTokenRouter());
app.use("/api", createReadModelsRouter());

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Not Found" });
});

app.use((err, _req, res, _next) => {
  const status = err?.status ?? 500;

  if (status >= 500) {
    console.error(err);
  }

  res
    .status(status)
    .json({ ok: false, error: err?.message ?? "Internal Server Error" });
});

const PORT = env.PORT ?? env.API_PORT ?? 4000;

function startServer() {
  return app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFilePath) {
  startServer();
}

export { app, assertRuntimeEnv, startServer };
