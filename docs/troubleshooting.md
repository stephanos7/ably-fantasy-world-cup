# Troubleshooting

These checks assume `DATABASE_URL` points to the same Neon database used by Netlify Functions and the Ably-hosted Postgres connector.

## Neon Has Schema

```sh
psql "$DATABASE_URL" -c "\dt"
```

If tables are missing, run:

```sh
pnpm db:migrate
pnpm db:seed
```

## LiveSync Objects Exist

```sh
psql "$DATABASE_URL" -c "
select table_name
from information_schema.tables
where table_schema = 'public'
and table_name in ('outbox', 'nodes');
"
```

The connector also requires `public.outbox_notify()` and `public_outbox_trigger`.

## Seed Data Exists

```sh
psql "$DATABASE_URL" -c "
select m.slug as match_slug, l.slug as league_slug
from matches m
join leagues l on l.id = m.league_id;
"
```

You should see `france-england` and `friends`.

## Outbox Rows Are Written

After triggering a simulator event:

```sh
psql "$DATABASE_URL" -c "
select sequence_id, mutation_id, channel, name, processed
from outbox
order by sequence_id desc
limit 10;
"
```

For one simulator event, the same `mutation_id` should have model updates for
the match, league leaderboard, league activity feed, and each affected fantasy
team:

```sh
psql "$DATABASE_URL" -c "
select
  sequence_id,
  mutation_id,
  channel,
  name,
  processed,
  jsonb_pretty(data) as data
from outbox
where mutation_id = '<MUTATION_ID>'
order by sequence_id;
"
```

Expected rows include:

- `league:friends:leaderboard` / `leaderboard.updated`
- `league:friends:activity` / `activity.created`
- `league:friends:teams` / `team.updated`
- `match:france-england` / `match.updated`

Client pages receive `team.updated` messages on the league-scoped teams channel
and ignore messages whose payload `userSlug` does not match the route user.

If rows are absent, check the API logs and confirm the simulator request completed successfully.

## Browser Receives Ably

In DevTools:

- Network should show `/api/ably/token`.
- Network should show Ably WebSocket traffic.
- The UI should show `LiveSync connected`.

If the UI shows a setup error, confirm `ABLY_API_KEY` is set for Netlify Functions and the connector points to the same Neon database as `DATABASE_URL`.

Under `netlify dev`, `/api/config` should report `databaseConfigured=true` and
`ablyConfigured=true`. If either value is false despite a populated root `.env`,
start dev with exported environment variables:

```sh
set -a
source .env
set +a
pnpm dev
```
