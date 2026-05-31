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
