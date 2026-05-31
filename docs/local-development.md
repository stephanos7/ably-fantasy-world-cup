# Local development

This project uses Postgres in Docker for local development. The database connection is configured with `DATABASE_URL` in `.env`.

## Setup

1. Copy the example environment variables:

```sh
cp .env.example .env
```

2. Start Postgres:

```sh
docker compose up -d
```

3. Install dependencies:

```sh
pnpm install
```

## Database migrations

Run migrations after Postgres is available:

```sh
pnpm db:migrate
```

This will apply all SQL migration files from `db/migrations/` and record them in `schema_migrations`.

## Seeding data

Seed the local database with stable demo data:

```sh
pnpm db:seed
```

The seed script is idempotent and can be re-run safely.

## Inspecting the database with a GUI

You can inspect the local Postgres database with any Postgres-compatible desktop client. Common options include TablePlus, DBeaver, Postico, pgAdmin, and Beekeeper Studio.

Use these local connection values:

| Field | Value |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| Database | `ably_fantasy_world_cup` |
| User | `postgres` |
| Password | `postgres` |

For Postico, create a new favorite and use the same values:

| Postico field | Value |
| --- | --- |
| Nickname | Optional, for example `Ably Fantasy World Cup Local` |
| Host | `localhost` |
| Port | `5432` |
| Database | `ably_fantasy_world_cup` |
| User | `postgres` |
| Password | `postgres` |

Leave SSH Tunnel, Startup Query, and Pre-Connect Shell Script disabled for the local Docker database.

## Resetting the local database

Reset is only permitted in non-production environments by default.

```sh
ALLOW_DB_RESET=true pnpm db:reset --seed
```

If `NODE_ENV=production`, the reset script will refuse to run unless `ALLOW_DB_RESET=true` is explicitly set.

## Troubleshooting

If a desktop GUI cannot connect to Postgres, confirm Docker is running and the Postgres container is healthy:

```sh
docker compose ps
docker compose logs postgres
```

## Verification

1. Confirm Postgres is healthy with `docker compose ps`.
2. Run `pnpm db:migrate`.
3. Run `pnpm db:seed`.
4. Re-run `pnpm db:seed` to verify idempotency.
5. Reset with `ALLOW_DB_RESET=true pnpm db:reset --seed` to verify the guarded reset flow.
