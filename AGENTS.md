# AGENTS.md

## Project purpose

This repo is a public, forkable Ably reference app.

It demonstrates a fantasy football app where simulated match events are processed by a backend, persisted to Postgres, and synchronized to multiple React clients using Ably LiveSync.

The core teaching point is:

- simulated match events are inputs
- Postgres is the source of truth
- the backend owns scoring and leaderboard truth
- LiveSync distributes database-confirmed state
- the frontend renders synced state and does not calculate authoritative scores or ranks

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
- SQL migrations in `db/migrations`
- internet-reachable Postgres for the app runtime, documented with Neon
- Docker Postgres is not the supported app path unless used internally for tests

Realtime:

- Ably LiveSync Postgres connector
- Ably browser SDK / Models SDK where appropriate
- Ably-hosted connector for internet-reachable Postgres databases such as Neon
- no Supabase
- no Next.js
- no Firebase

Testing:

- Node.js built-in test runner for API and scoring tests
- `node:test`
- `node:assert/strict`
- Playwright only for small browser smoke tests when explicitly required

Do not add Vitest unless explicitly requested.

Package manager:

- pnpm

## Architectural rules

Do not calculate fantasy scores or leaderboard rankings in the frontend.

All authoritative scoring and ranking updates must happen in the backend.

Every state-changing backend flow must update app tables and write the relevant LiveSync outbox record inside the same database transaction.

The frontend may use HTTP for initial state and Ably LiveSync for subsequent updates.

The frontend may render scores, ranks, and activity returned by the API or LiveSync messages, but it must not calculate authoritative fantasy scores, team totals, or leaderboard ranks.

Use small, readable modules. Avoid over-abstraction.

## Runtime path

This repo supports one app runtime path.

- local or hosted React app
- local or hosted Express API
- internet-reachable Postgres, documented with Neon
- Ably-hosted LiveSync Postgres connector
- browser clients subscribed to Ably channels

Neon is not required by the application code. The app must read `DATABASE_URL` and work with any compatible Postgres database.

Neon is documented because it provides an internet-reachable Postgres database that Ably’s hosted connector can access.

Do not assume the Ably-hosted connector can reach local Docker Postgres on `localhost`.

Do not add HTTP-only fallback mode.

Do not add a self-hosted connector path unless the official Ably connector image and configuration are provided or verified from official Ably docs.

Do not fake realtime with polling.

## Schema-first implementation

Before implementing backend flows, verify the current schema can represent the required inputs and state transitions.

If required fields or seed data are missing, stop and propose a focused schema/data PR instead of working around the gap in application code.

When adding features, use the actual current schema column names. Do not assume older proposed names exist.

Known current schema naming conventions include:

- `leaderboard_entries.points`
- `fantasy_team_scores.score`
- `match_events.event_time`
- `players.name`

Do not use non-existent columns such as:

- `leaderboard_entries.total_points`
- `fantasy_team_scores.total_points`
- `match_events.minute`
- `players.display_name`

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

Do not change the LiveSync connector schema unless the official Ably docs require it.

## LiveSync outbox writes

Application code may insert rows into `public.outbox`, but must not set connector-owned fields.

Allowed application-owned outbox fields:

- `mutation_id`
- `channel`
- `name`
- `rejected`
- `data`
- `headers`

Do not set:

- `sequence_id`
- `locked_by`
- `lock_expiry`
- `processed`

Use the shared `insertOutboxEvent()` helper for all outbox writes.

Outbox writes must happen in the same transaction as the related application state changes.

## LiveSync channels and events

Use product-specific channels and event names.

Channel patterns:

- `league:{leagueSlug}:leaderboard`
- `league:{leagueSlug}:activity`
- `team:{userSlug}`
- `match:{matchSlug}`

Seeded demo examples:

- `league:friends:leaderboard`
- `league:friends:activity`
- `team:stephanos`
- `team:maria`
- `team:andreas`
- `team:theo`
- `match:france-england`

Event names:

- `leaderboard.updated`
- `activity.created`
- `team.updated`
- `match.updated`

Do not invent alternate event names unless the existing event contract is intentionally changed and docs/tests are updated.

## Frontend data ownership

The frontend may:

- fetch initial state over HTTP
- subscribe to Ably/LiveSync channels
- merge backend-computed LiveSync messages into UI state
- display connection status
- display scoring rules for user understanding

The frontend must not:

- calculate authoritative player scores
- calculate authoritative fantasy team totals
- calculate authoritative leaderboard ranks
- mutate leaderboard state directly after simulator actions
- use polling to fake LiveSync behavior
- present HTTP-only mode as a valid demo path

Control-room actions must call the backend API. The backend updates Postgres and writes outbox rows.

## Scoring logic

Fantasy scoring and leaderboard ranking must be implemented as pure JavaScript functions.

For v1, only support:

- `goal`: +5
- `assist`: +3
- `yellow_card`: -1
- `captainMultiplier`: 2

Do not add advanced fantasy rules unless specifically requested.

Out of scope for v1 unless explicitly requested:

- VAR correction
- event reversal
- clean sheets
- penalties
- own goals
- substitutions
- bonus points

Scoring functions must:

- accept plain objects using stable slugs where practical
- avoid database clients
- avoid SQL row coupling where practical
- avoid Express request/response objects
- avoid Ably SDK objects
- avoid React state
- be covered by Node.js built-in tests
- run without Docker or Postgres

The frontend may display scoring rules, but must not calculate authoritative fantasy scores or leaderboard ranks.

## Environment variables

Never commit secrets.

The app should use `DATABASE_URL` for the internet-reachable Postgres database used by both the API and the Ably-hosted connector.

```env
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
ABLY_API_KEY=your-ably-api-key
VITE_API_BASE_URL=http://localhost:4000
```

`ABLY_API_KEY` is server-side only.

The browser must never receive the raw Ably API key.

If browser Ably access is required, use a backend token endpoint.

## Neon and LiveSync setup

Neon starts empty.

Before using Neon with Ably LiveSync, the existing migrations and seed scripts must be run against the Neon `DATABASE_URL`.

Required order:

1. Create Neon database.
2. Set `DATABASE_URL` to the Neon connection string.
3. Run `pnpm db:migrate`.
4. Run `pnpm db:seed`.
5. Verify `public.outbox`, `public.nodes`, `public.outbox_notify()`, and `public_outbox_trigger` exist.
6. Configure the Ably-hosted Postgres connector against the same Neon database.
7. Start the API with the same Neon `DATABASE_URL`.
8. Start the frontend.
9. Trigger simulator events and verify browser clients update through Ably.

Do not create Neon-specific migrations.

Do not manually create tables in the Neon dashboard.

The schema source of truth is `db/migrations`.

The seed source of truth is `db/scripts/seed.js`.

## Reset safety

Database reset commands can be destructive.

Reset scripts must refuse to run in production.

Reset targets hosted databases such as Neon by default, so require an explicit safety flag:

```env
ALLOW_DB_RESET=true
```

Reset scripts should print the target database host and database name before destructive actions.

Never log database passwords or full secrets.

## Commands

Install:

```bash
pnpm install
```

Run all dev services:

```bash
pnpm dev
```

Run frontend:

```bash
pnpm dev:web
```

Run API:

```bash
pnpm dev:api
```

Run migrations:

```bash
pnpm db:migrate
```

Seed database:

```bash
pnpm db:seed
```

Reset database:

```bash
pnpm db:reset
```

Inspect database, if available:

```bash
pnpm db:inspect
```

Run tests:

```bash
pnpm test
```

Run lint:

```bash
pnpm lint
```

Run e2e, if available:

```bash
pnpm test:e2e
```

## Testing rules

Use the existing Node.js built-in test runner for backend and scoring tests.

Use:

- `node:test`
- `node:assert/strict`

Do not add Vitest unless explicitly requested.

Backend/scoring tests should run without Docker unless they explicitly test database integration.

Database integration tests may require Postgres, but should be clearly separated from pure unit tests.

Database integration tests should use `TEST_DATABASE_URL`, not the app `DATABASE_URL`.

Do not make CI depend on Neon or Ably credentials by default.

LiveSync with Neon + Ably-hosted connector is a manual or optional integration path unless dedicated test credentials are provided.

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

- app runs through the documented Neon + Ably LiveSync path
- tests pass
- docs are updated
- no frontend code owns backend truth
- database changes are represented as migrations
- LiveSync outbox writes use the shared helper
- no connector-owned outbox fields are set by app code
- no secrets are committed
