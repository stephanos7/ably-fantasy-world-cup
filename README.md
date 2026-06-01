# Ably Fantasy World Cup

A public, forkable Ably reference app for a fantasy football experience powered by Neon Postgres and Ably LiveSync.

## What This App Demonstrates

- Simulated match events enter the backend as inputs.
- Postgres stores the confirmed application state.
- Backend transactions update app tables and write LiveSync outbox records together.
- Ably LiveSync distributes database-confirmed state to React clients.
- The frontend renders synced state and does not calculate fantasy scoring or leaderboard truth.

HTTP is used for initial reads and simulator actions only. Realtime updates are delivered through Ably LiveSync from database-backed outbox messages.

## Quick Start

1. Create a Neon database and copy its Postgres connection string with `sslmode=require`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `ABLY_API_KEY`, and `VITE_API_BASE_URL`.
3. Run migrations and seed against Neon.
4. Create an Ably app.
5. Configure the Ably-hosted LiveSync Postgres connector against the same Neon database.
6. Start the API and frontend.
7. Open multiple browser tabs and trigger a simulator event.

```sh
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev:api
pnpm dev:web
```

The web app runs on `http://localhost:5173` and the API runs on `http://localhost:4000`.

Seeded demo routes:

- `http://localhost:5173/control-room`
- `http://localhost:5173/league/friends`
- `http://localhost:5173/client/stephanos`
- `http://localhost:5173/tv/friends`
- `http://localhost:5173/debug`

Open `/control-room`, `/league/friends`, `/client/stephanos`, and `/tv/friends` in separate tabs. Click `Mbappé goal` in the control room and confirm the other tabs update without refresh.

## Required Runtime Path

```text
React app
-> Express API
-> Neon Postgres
-> Ably-hosted LiveSync Postgres connector
-> Ably
-> browser clients
```

The app requires:

- `DATABASE_URL` pointing to an internet-reachable Postgres database, documented with Neon.
- `ABLY_API_KEY` on the API server for browser-safe Ably token auth.
- The Ably-hosted Postgres connector configured against the same database as the API.

Docker Postgres is not the supported app path for this Ably LiveSync demo. It may exist only for internal experimentation or test infrastructure.

## Commands

```sh
pnpm dev
pnpm dev:api
pnpm dev:web
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
  api/      Express API service
  web/      React + Vite web client
packages/
  shared/   Shared JavaScript constants and schemas
db/
  migrations/
  scripts/
docs/
```

## Documentation

- [Local development with Neon and Ably](docs/local-development.md)
- [Neon + Ably LiveSync setup](docs/local-livesync-neon.md)
- [Ably LiveSync connector setup](docs/setup-ably-livesync.md)
- [Ably LiveSync details](docs/livesync.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
