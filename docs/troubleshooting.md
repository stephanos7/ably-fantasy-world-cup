# Troubleshooting

These checks assume `DATABASE_URL` points to the same direct Neon database used by Netlify Functions and the Ably-hosted Postgres connector, not the Neon `-pooler` host.

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

## Outbox Verification

Outbox rows may be processed or removed quickly by the Ably connector, so do not rely on them remaining visible for long after a simulator event.

After triggering a simulator event, first inspect the simulator response. It includes diagnostic `outboxMessages` with the actual `sequenceId`, `channel`, and `name` values inserted by the backend transaction.

Use SQL inspection as a supporting check:

```sh
psql "$DATABASE_URL" -c "
select sequence_id, mutation_id, channel, name, processed
from outbox
order by sequence_id desc
limit 10;
"
```

For one simulator event, the same `mutation_id` should have model updates for the match, league leaderboard, league activity feed, and each affected fantasy team:

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

Client pages receive `team.updated` messages on the league-scoped teams channel and ignore messages whose payload `userSlug` does not match the route user.

If rows are absent, check the Netlify Function logs and confirm the simulator request completed successfully.

The Ably dashboard or channel inspector is the durable proof that the outbox rows were delivered.

## Function Response Shows Outbox Sequence IDs But Browser Does Not Update

Check these items in order:

1. Confirm Ably receives `league:friends:leaderboard` with `leaderboard.updated`.
2. Confirm Ably receives `league:friends:activity` with `activity.created`.
3. Confirm Ably receives `league:friends:teams` with `team.updated`.
4. Confirm Ably receives `match:france-england` with `match.updated`.
5. Confirm the frontend is subscribed to `league:friends:leaderboard` on League and TV.
6. Confirm the frontend is subscribed to `league:friends:teams` and `league:friends:activity` on Client.
7. Confirm the Client page filters `team.updated` by payload `userSlug`.
8. Confirm the Ably connector is configured against the same direct Neon database as `DATABASE_URL`, not the Neon `-pooler` host.
9. Confirm `ABLY_API_KEY` belongs to the same Ably app as the connector.

## Netlify Route Params Are Wrong

Symptoms:

- `leagueSlug` becomes `activity`
- `userSlug` becomes `team`

What this means:

- Netlify redirects must pass params correctly.
- Functions must not parse dynamic params using the final URL segment.
- Use the route-aware `getParam` helper from `netlify/lib/functions-shared.js`.

If this happens, the route probably reached the function through a redirect shape such as `/api/leagues/friends/activity`, but the function read the last segment instead of the route param.

## Browser Receives Ably

In DevTools:

- Network should show `/api/ably/token`.
- Network should show Ably WebSocket traffic.
- The UI should show `LiveSync connected`.

If the UI shows a setup error, confirm `ABLY_API_KEY` is set for Netlify Functions and the connector points to the same direct Neon database as `DATABASE_URL`, not the Neon `-pooler` host.

Under `netlify dev`, `/api/config` should report `databaseConfigured=true` and `ablyConfigured=true`. If either value is false despite a populated root `.env`, start dev with exported environment variables:

```sh
set -a
source .env
set +a
pnpm dev
```
