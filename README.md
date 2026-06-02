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
