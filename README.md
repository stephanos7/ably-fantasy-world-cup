# Ably Fantasy World Cup

A public, forkable Ably reference app for a fantasy football experience powered by Postgres and Ably LiveSync.

This repository is currently an initial monorepo skeleton. Product functionality is intentionally not implemented yet.

## What This App Will Demonstrate

- Simulated match events enter the backend as inputs.
- Postgres stores the confirmed application state.
- Backend transactions update app tables and write LiveSync outbox records together.
- Ably LiveSync distributes database-confirmed state to React clients.
- The frontend renders synced state and does not calculate fantasy scoring or leaderboard truth.

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

## Prerequisites

- Node.js 20 or newer
- pnpm 9 or newer
- Docker, for local Postgres

## Local Run

```sh
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

The web app runs on `http://localhost:5173` and the API runs on `http://localhost:4000`.

## Hosted Demo

The hosted demo path is expected to use:

- a hosted web deployment for `apps/web`
- a hosted Node service for `apps/api`
- Neon Postgres or another managed Postgres provider
- Ably LiveSync configured against the production database

The production demo URL will be documented here once the app is implemented and deployed.

## Deploy Your Own

1. Fork this repository.
2. Provision a Postgres database, such as Neon.
3. Configure Ably and the LiveSync Postgres connector.
4. Set environment variables from `.env.example` in your hosting provider.
5. Deploy `apps/api` as a Node.js service.
6. Deploy `apps/web` as a static Vite build.
7. Run database migrations against your production database.

Detailed deployment docs will live in [docs/deployment.md](docs/deployment.md).

## Commands

```sh
pnpm dev
pnpm --filter web dev
pnpm --filter api dev
pnpm db:migrate
pnpm db:seed
pnpm db:reset
pnpm lint
pnpm test
pnpm test:e2e
```

## Status

This is scaffold-only. The next implementation steps are described in [docs/architecture.md](docs/architecture.md) and [docs/livesync.md](docs/livesync.md).
