# AGENTS.md

## Project purpose

This repo is a public, forkable Ably reference app.

It demonstrates a fantasy football app where simulated match events are processed by a backend, persisted to Postgres, and synchronized to multiple React clients using Ably LiveSync.

The core teaching point is:

- simulated match events are inputs
- Postgres is the source of truth
- LiveSync distributes database-confirmed state
- the frontend renders synced state and does not calculate leaderboard truth

## Required stack

Frontend:

- React
- Vite
- JavaScript, not TypeScript
- React Router
- Material UI
- MUI ThemeProvider

Backend:

- Node.js
- Express
- JavaScript, not TypeScript
- node-postgres
- Zod for runtime validation

Database:

- Postgres
- SQL migrations in db/migrations
- local Docker Postgres
- hosted Neon Postgres for production demo

Realtime:

- Ably LiveSync Postgres connector
- Ably Models SDK where appropriate
- no Supabase
- no Next.js
- no Firebase

Testing:

- Vitest for pure scoring logic
- Supertest for API integration tests
- Playwright for one or two demo smoke tests

Package manager:

- pnpm

## Architectural rules

Do not calculate fantasy scores or leaderboard rankings in the frontend.

All scoring and ranking updates must happen in the backend.

Every state-changing backend flow must update app tables and write the relevant LiveSync outbox record inside the same database transaction.

The frontend may call sync endpoints for initial model state and then merge LiveSync updates.

LiveSync outbox, nodes, notify function, and trigger must match the official Ably Postgres connector schema; do not create a simplified custom schema.

Use small, readable modules. Avoid over-abstraction.

## Commands

Install:
pnpm install

Run all dev services:
pnpm dev

Run frontend:
pnpm --filter web dev

Run API:
pnpm --filter api dev

Run migrations:
pnpm db:migrate

Seed database:
pnpm db:seed

Reset database:
pnpm db:reset

Run tests:
pnpm test

Run lint:
pnpm lint

Run e2e:
pnpm test:e2e

## Ably LiveSync database schema

When working on database migrations or outbox-related code, do not invent or approximate the LiveSync connector schema.

The migration must use the official Ably LiveSync Postgres connector schema for:

- `public.nodes`
- `public.outbox`
- `public.outbox_notify()`
- `public_outbox_trigger`

Before changing these objects, check the official Ably docs:

https://ably.com/docs/livesync/postgres.md

The migration should include a comment with:

- source URL
- date checked
- note that the schema matches the official connector docs

Application code may insert outbox rows, but must not set or mutate connector-owned fields such as:

- `locked_by`
- `lock_expiry`
- `processed`

Outbox inserts should set only application-owned message fields such as:

- `mutation_id`
- `channel`
- `name`
- `rejected`
- `data`
- `headers`

If the official Ably docs differ from the current migration, follow the official docs and explain the change in the PR description.

## PR expectations

Each PR should be small and reviewable.

Every PR must update relevant docs if behavior changes.

Every PR must include:

- summary
- files changed
- tests run
- known limitations

Do not add new production dependencies without explaining why.
Never commit secrets.

## Definition of done

A change is done only when:

- app still runs locally
- tests pass
- docs are updated
- no frontend code owns backend truth
- no secrets are committed
