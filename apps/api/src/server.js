import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { APP_NAME } from "@ably-fantasy-world-cup/shared";
import { fileURLToPath } from "node:url";
import { createDatabasePool } from "./db/pool.js";
import { createSimulatorRouter } from "./routes/simulator.js";

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().optional()
});

const env = envSchema.parse(process.env);
const app = express();

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
  res.json({ ok: true, service: APP_NAME });
});

app.get("/api/config", (_req, res) => {
  res.json({
    ok: true,
    service: APP_NAME,
    environment: process.env.NODE_ENV ?? "development",
    hasDatabase: Boolean(env.DATABASE_URL)
  });
});

app.post("/api/demo/reset", (_req, res) => {
  res
    .status(501)
    .json({ ok: false, error: "Demo reset is not implemented yet" });
});

app.use("/api/simulator", createSimulatorRouter());

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

const PORT = env.API_PORT;

function startServer() {
  return app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFilePath) {
  startServer();
}

export { app, startServer };
