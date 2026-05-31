import 'dotenv/config';
import express from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { APP_NAME } from '@ably-fantasy-world-cup/shared';

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().optional()
});

const env = envSchema.parse(process.env);
const app = express();

app.use(express.json());

if (env.DATABASE_URL) {
  app.locals.db = new Pool({ connectionString: env.DATABASE_URL });
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: APP_NAME
  });
});

app.listen(env.API_PORT, () => {
  console.log(`API listening on http://localhost:${env.API_PORT}`);
});
