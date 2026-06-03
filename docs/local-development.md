# Local Development

Local development runs the React app and Netlify Functions through `netlify dev`. The database is Neon, and realtime delivery is Ably LiveSync.

Docker Postgres is not a supported app path. The Ably-hosted connector must read from an internet-reachable Postgres database.

## Setup

1. Create a Neon project and database.
2. Copy the direct Neon Postgres connection string (do NOT use connection pooler) and include `sslmode=require`.
3. Copy the example environment file.

```sh
cp .env.example .env
```

4. Set the required server-side variables in the root `.env` file.

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
ABLY_API_KEY=your-ably-api-key
```

Do not use the Neon `-pooler` host for this app's `DATABASE_URL`. Use the direct Neon host for local dev, migrations, seed scripts, and the Ably-hosted connector.

Netlify dev normally injects variables from the root `.env` file. If your local
shell or Netlify CLI version does not load them reliably, export the file before
starting the app:

```sh
set -a
source .env
set +a
pnpm dev
```

5. Install dependencies.

```sh
pnpm install
```

6. Run migrations and seed against Neon.

```sh
pnpm db:migrate
pnpm db:seed
```

7. Configure the Ably-hosted Postgres connector against the same direct Neon database in `DATABASE_URL`. Do not use the Neon `-pooler` host.

8. Start Netlify dev.

```sh
pnpm dev
```

## Browser Demo

Open the local Netlify dev URL and use these routes in separate tabs:

| Route               | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `/control-room`     | Trigger seeded France vs England simulator events.             |
| `/league/friends`   | View backend-ranked league standings and activity.             |
| `/client/stephanos` | View one seeded user's team, squad, rank, score, and activity. |
| `/tv/friends`       | View a larger read-only leaderboard.                           |
| `/debug`            | Check Netlify Function, Neon, and Ably LiveSync configuration. |

Click `Mbappé goal` in `/control-room`. The league, client, and TV tabs should update without refresh when the connector is reading outbox rows from the same Neon database.

The frontend uses same-origin HTTP for initial state and simulator actions. Subsequent updates must arrive through Ably LiveSync.

## Database Inspection

Use any Postgres-compatible GUI with the Neon connection details, or run:

```sh
pnpm db:inspect
```

`db:inspect` prints the target host, database name, required LiveSync object checks, seeded match check, and core table counts.

## Resetting Neon

Reset is destructive and targets the `DATABASE_URL` database. It refuses `NODE_ENV=production`, requires `ALLOW_DB_RESET=true`, and prints only the target host and database name.

```sh
ALLOW_DB_RESET=true pnpm db:reset --seed
```

Do not run reset against a shared or production database.
