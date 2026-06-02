# Ably Fantasy World Cup

A public, forkable Ably reference app for a fantasy football experience powered by Netlify, Neon Postgres, and Ably LiveSync.

For a page-by-page guide, see [Demo walkthrough](docs/demo-walkthrough.md).

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

The root `.env` file must include `DATABASE_URL` and `ABLY_API_KEY` for Netlify Functions. If Netlify CLI does not load `.env` in your shell, run:

```sh
set -a
source .env
set +a
pnpm dev
```

## Configure Ably LiveSync

This is the point in the tutorial where LiveSync should be configured: after `pnpm db:migrate` and `pnpm db:seed`, but before you rely on browser tabs updating in realtime.

The reason for that ordering is practical. The Ably-hosted Postgres connector does not create this app's tables for you. It expects the required connector objects to already exist in the database it connects to. In this repo, those objects are created by [`db/migrations/001_initial_schema.sql`](db/migrations/001_initial_schema.sql), alongside the app tables and seedable demo schema.

This walkthrough is based on Ably's official Postgres database connector guide: https://ably.com/docs/livesync/postgres.md, checked on 2026-06-02.

### What LiveSync Is Doing In This App

The app uses the transactional outbox pattern described in Ably's guide.

When you click a simulator action in `/control-room`, the backend does not publish directly from React and it does not let the frontend calculate scores. Instead:

1. The simulator request reaches a Netlify Function.
2. Backend scoring logic updates Postgres inside one transaction.
3. The same transaction inserts rows into `public.outbox`.
4. The Ably-hosted Postgres connector reads those outbox rows.
5. The connector publishes Ably messages to channels such as `league:friends:leaderboard`.
6. Browser clients subscribed to those channels merge the database-confirmed payload into their UI state.

The important files are:

- [`db/migrations/001_initial_schema.sql`](db/migrations/001_initial_schema.sql): creates `public.nodes`, `public.outbox`, `public.outbox_notify()`, and `public_outbox_trigger` using Ably's connector schema.
- [`backend/src/db/queries/outbox.js`](backend/src/db/queries/outbox.js): the only helper application code should use to insert LiveSync outbox rows.
- [`backend/src/scoring/process-match-event.js`](backend/src/scoring/process-match-event.js): processes a simulated match event, updates scores and rankings, then writes the LiveSync messages inside the same transaction.
- [`backend/src/http/ably-token.js`](backend/src/http/ably-token.js): creates browser-safe Ably token requests from the server-side `ABLY_API_KEY`.
- [`apps/web/src/api/livesync.js`](apps/web/src/api/livesync.js): creates the browser Ably client using `/api/ably/token`; it never receives the raw Ably API key.
- [`apps/web/src/App.jsx`](apps/web/src/App.jsx): subscribes to LiveSync channels and merges incoming backend-computed messages into React state.

### Step 1: Confirm The Database Is Ready

Make sure `.env` points at the same internet-reachable Postgres database that Ably will connect to. For the documented path, use Neon:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

Run migrations and seed data:

```sh
pnpm db:migrate
pnpm db:seed
```

Then inspect the database:

```sh
pnpm db:inspect
```

The output should report these LiveSync objects as `true`:

```json
{
  "livesyncObjects": {
    "outbox": true,
    "nodes": true,
    "outboxNotify": true,
    "publicOutboxTrigger": true
  }
}
```

Do not create these tables manually in the Neon dashboard. The schema source of truth is `db/migrations`. If the inspect command reports a missing object, rerun migrations against the correct `DATABASE_URL` before configuring Ably.

### Step 2: Create The Ably App

In the Ably dashboard, create a new app for this demo or use an existing app dedicated to this fork.

Copy a server-side API key for that Ably app and add it to `.env`:

```env
ABLY_API_KEY=your-ably-api-key
```

This key is for Netlify Functions only. The browser uses [`/api/ably/token`](netlify/functions/ably-token.js), which calls [`backend/src/http/ably-token.js`](backend/src/http/ably-token.js) to create a limited token request with subscribe capability for:

```js
{
  "league:*": ["subscribe"],
  "match:*": ["subscribe"]
}
```

Do not add `ABLY_API_KEY` to Vite client environment variables and do not expose it in React.

### Step 3: Create The Postgres Integration Rule

In the Ably dashboard for the same app:

1. Open the app's Integrations page.
2. Choose **New Integration Rule**.
3. Choose **Postgres**.
4. Configure the rule to connect to the same database as `DATABASE_URL`.

Use these values for this repo:

| Ably rule field | Value for this app |
| --- | --- |
| URL | Your Neon Postgres connection URL. It must point at the same database as `DATABASE_URL`. |
| Outbox table schema | `public` |
| Outbox table name | `outbox` |
| Nodes table schema | `public` |
| Nodes table name | `nodes` |
| SSL mode | `require` for the documented Neon setup |
| Primary site | Choose the Ably site closest to your database or deployment region |

Ably's guide explains that the connector consumes rows from the configured outbox table and publishes them to Ably channels. In this app, each outbox row already contains the channel, event name, and JSON payload that should be delivered to the browser.

For a first local demo, it is acceptable to point the connector at the same Neon connection string you use for `DATABASE_URL`. For a production fork, create a narrower database user for the connector following Ably's privileges section. The connector only needs access to the LiveSync connector objects, not the fantasy app tables.

### Step 4: Understand The Outbox Rows This App Writes

Do not manually insert outbox rows while following the demo. The backend writes them when simulator events are processed.

The insert helper in [`backend/src/db/queries/outbox.js`](backend/src/db/queries/outbox.js) only sets application-owned fields:

- `mutation_id`
- `channel`
- `name`
- `rejected`
- `data`
- `headers`

It intentionally does not set connector-owned fields such as `sequence_id`, `locked_by`, `lock_expiry`, or `processed`.

For one simulator event, [`backend/src/scoring/process-match-event.js`](backend/src/scoring/process-match-event.js) writes messages like these:

| Channel | Event name | Used by |
| --- | --- | --- |
| `league:friends:leaderboard` | `leaderboard.updated` | `/league/friends`, `/tv/friends` |
| `league:friends:activity` | `activity.created` | `/league/friends`, `/client/stephanos` |
| `league:friends:teams` | `team.updated` | `/client/stephanos` |
| `match:france-england` | `match.updated` | match-aware views and diagnostics |

If you fork the app and rename channels or event names, update the backend outbox writes, frontend subscriptions, token capabilities, tests, and docs together. The main places to check are [`backend/src/scoring/process-match-event.js`](backend/src/scoring/process-match-event.js), [`backend/src/http/ably-token.js`](backend/src/http/ably-token.js), and [`apps/web/src/App.jsx`](apps/web/src/App.jsx).

### Step 5: Start The App And Verify Delivery

Start Netlify dev:

```sh
pnpm dev
```

Open these routes in separate tabs:

```text
/debug
/control-room
/league/friends
/client/stephanos
/tv/friends
```

On `/debug`, confirm:

- `/api/config` reports `database.configured=true`.
- `/api/config` reports `ably.configured=true`.
- A live view can request `/api/ably/token`.
- The LiveSync status eventually shows a connected or subscribed state.

Then trigger `Mbappé goal` in `/control-room`.

Expected result:

- The simulator response includes `outboxMessages`.
- `/league/friends` updates without refresh.
- `/client/stephanos` updates without refresh if the event affects that manager's team.
- `/tv/friends` updates without refresh.
- The Ably dashboard shows messages on channels such as `league:friends:leaderboard` or `league:friends:teams`.

Ably's connector may process and remove outbox rows quickly. That is expected. Do not rely on `public.outbox` retaining every historical message. Use the simulator response, `/debug`, browser dev tools, and the Ably dashboard to confirm delivery.

### Step 6: If LiveSync Does Not Work

Check these in order:

1. `pnpm db:inspect` must show all LiveSync objects as present.
2. The Ably Postgres rule must point to the same Neon database as `DATABASE_URL`.
3. The Ably rule must use `public.outbox` and `public.nodes`.
4. `ABLY_API_KEY` must belong to the same Ably app that owns the Postgres integration rule.
5. `/api/config` must report both database and Ably as configured.
6. `/api/ably/token` must return a token request, not a 503.
7. The browser console should not show `LiveSync setup error`.
8. The frontend must be open on a route that subscribes to the channel you expect to test.

The app has no HTTP-only fallback and does not use polling to fake realtime updates. If browser tabs only update after refresh, the initial HTTP reads are working but LiveSync delivery is not.

## What Each Page Does

| Route | Real-world equivalent | Initial data | LiveSync channels | Expected update |
| --- | --- | --- | --- | --- |
| `/` | Demo launcher | none | none | Guides the demo flow |
| `/control-room` | Upstream match feed or event operator | match summary, activity summary | optional debug-only reads | Sends simulator events |
| `/league/friends` | Shared league table | leaderboard, activity | `league:friends:leaderboard`, `league:friends:activity` | Standings and activity update |
| `/client/stephanos` | Individual manager view | team, squad, activity | `league:friends:teams`, `league:friends:activity` | Points, rank, squad, and activity update for matching `userSlug` |
| `/tv/friends` | Public display or TV scoreboard | leaderboard | `league:friends:leaderboard` | Read-only leaderboard update |
| `/debug` | Developer diagnostics | config, health | debug subscriptions only | Shows setup status and last message |

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

Docker Postgres and HTTP-only local mode are not supported runtime paths.

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

## Fork This Repo

1. Clone or fork the repository.
2. Create a Neon database and set `DATABASE_URL`.
3. Run `pnpm db:migrate` and `pnpm db:seed`.
4. Configure the Ably-hosted LiveSync connector against the same database.
5. Update the app name, theme, and seed data for your fork.
6. Run the production smoke test below before sharing the fork.

## Common Customizations

See [Customization guide](docs/customization.md) for the supported extension points.

- Branding and theme updates
- Seeded demo users, teams, players, and match data
- Scoring rule changes
- Domain remapping while keeping the Postgres + LiveSync ownership model

## Production Smoke Test

1. Open `/control-room` and `/league/friends`.
2. Trigger `Mbappé goal`.
3. Confirm `/league/friends` updates without a refresh.
4. Open `/client/stephanos`.
5. Trigger an event that affects Stephanos.
6. Confirm points update without a refresh.
7. Open the Ably dashboard and confirm `league:friends:teams` receives `team.updated`.

## Workspace Layout

```text
apps/
  web/      React + Vite web client
backend/    Shared backend modules for Netlify Functions
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

- [Demo walkthrough](docs/demo-walkthrough.md)
- [Local development](docs/local-development.md)
- [Neon + Ably LiveSync setup](docs/local-livesync-neon.md)
- [Ably LiveSync connector setup](docs/setup-ably-livesync.md)
- [Ably LiveSync details](docs/livesync.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Architecture](docs/architecture.md)
- [Customization guide](docs/customization.md)
- [Deployment](docs/deployment.md)

## License

See [LICENSE](LICENSE) for the MIT license text.
