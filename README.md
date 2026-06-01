# Ably Fantasy World Cup

A public, forkable Ably reference app for a fantasy football experience powered by Netlify, Neon Postgres, and Ably LiveSync.

## What This App Demonstrates

- Simulated match events enter the backend as inputs.
- Netlify Functions update Neon Postgres inside transactions.
- Postgres stores the confirmed application state.
- Backend transactions update app tables and write LiveSync outbox records together.
- Ably LiveSync distributes database-confirmed state to React clients.
- The frontend renders synced state and does not calculate fantasy scoring or leaderboard truth.

HTTP is used for initial reads and simulator actions only. Realtime updates are delivered through Ably LiveSync from database-backed outbox messages.

## Quick Start

1. Create a Neon database and copy its Postgres connection string with `sslmode=require`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run `pnpm db:migrate`.
4. Run `pnpm db:seed`.
5. Create an Ably app.
6. Configure the Ably-hosted LiveSync Postgres connector against the same Neon database.
7. Set `ABLY_API_KEY` in `.env`.
8. Run `pnpm dev`.
9. Open the local Netlify dev URL.
10. Open `/control-room`, `/league/friends`, `/client/stephanos`, and `/tv/friends`.
11. Trigger `Mbappé goal`.
12. Confirm the other pages update without refresh.

```sh
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

By default, `pnpm dev` runs `netlify dev`. The frontend uses same-origin `/api/...` requests that Netlify redirects to Functions.

## Required Runtime Path

```text
React/Vite frontend
-> Netlify Functions
-> Neon Postgres
-> Ably-hosted LiveSync Postgres connector
-> Ably
-> browser clients
```

The app requires:

- `DATABASE_URL` pointing to the Neon database used by Netlify Functions and the Ably-hosted connector.
- `ABLY_API_KEY` available only to Netlify Functions for browser-safe Ably token auth.
- The Ably-hosted Postgres connector configured against the same Neon database.

Docker Postgres, a standalone REST API server, Render API deployment, and HTTP-only local mode are not supported runtime paths.

## Commands

```sh
pnpm dev
pnpm build
pnpm db:migrate
pnpm db:seed
pnpm db:inspect
ALLOW_DB_RESET=true pnpm db:reset --seed
pnpm lint
pnpm test
pnpm test:e2e
```

`pnpm db:reset` refuses `NODE_ENV=production` and requires `ALLOW_DB_RESET=true`. It prints only the target host and database name, never credentials.

## Workspace Layout

```text
apps/
  api/      Shared backend modules for Netlify Functions
  web/      React + Vite web client
netlify/
  functions/
packages/
  shared/   Shared JavaScript constants and schemas
db/
  migrations/
  scripts/
docs/
```

## Documentation

- [Local development](docs/local-development.md)
- [Neon + Ably LiveSync setup](docs/local-livesync-neon.md)
- [Ably LiveSync connector setup](docs/setup-ably-livesync.md)
- [Ably LiveSync details](docs/livesync.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Architecture](docs/architecture.md)
- [Customization guide](docs/customization.md)
- [Deployment](docs/deployment.md)
