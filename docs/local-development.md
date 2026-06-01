# Local Development

Local development runs the React app and Express API on your machine, but the database is Neon and realtime delivery is Ably LiveSync.

Docker Postgres is not the supported app path for this Ably LiveSync demo. The supported path is local app services plus an internet-reachable Postgres database that the Ably-hosted connector can reach.

## Setup

1. Create a Neon project and database.
2. Copy the Neon Postgres connection string and include `sslmode=require`.
3. Copy the example environment file.

```sh
cp .env.example .env
```

4. Set the required environment variables.

```env
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
ABLY_API_KEY=your-ably-api-key
VITE_API_BASE_URL=http://localhost:4000
```

5. Install dependencies.

```sh
pnpm install
```

6. Run migrations against Neon.

```sh
pnpm db:migrate
```

7. Seed Neon.

```sh
pnpm db:seed
```

8. Configure the Ably-hosted Postgres connector against the same Neon database in `DATABASE_URL`.

9. Start the API and frontend.

```sh
pnpm dev:api
pnpm dev:web
```

## Browser Demo

Open these routes in separate tabs:

| Route | Purpose |
| --- | --- |
| `/control-room` | Trigger seeded France vs England simulator events. |
| `/league/friends` | View backend-ranked league standings and activity. |
| `/client/stephanos` | View one seeded user's team, squad, rank, score, and activity. |
| `/tv/friends` | View a larger read-only leaderboard. |
| `/debug` | Check API, Neon, and Ably LiveSync configuration. |

Click `Mbappé goal` in `/control-room`. The league, client, and TV tabs should update without refresh when the connector is reading outbox rows from the same Neon database.

The frontend uses HTTP for initial state and simulator actions. Subsequent updates must arrive through Ably LiveSync.

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
