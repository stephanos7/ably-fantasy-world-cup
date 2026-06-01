# Customization Guide

This app is designed to be forked while keeping the same Ably LiveSync teaching path:

simulator input -> Netlify Function -> Postgres transaction -> LiveSync outbox -> Ably -> React views

Keep Postgres as the source of truth. The frontend may change how data looks, but it must not calculate authoritative scores, team totals, or leaderboard ranks.

## Theme and app name

Update the visible brand name in `packages/shared/src/index.js`:

```js
export const APP_NAME = 'Ably Fantasy World Cup';
```

Update colors, typography, spacing, and component defaults in `createAppTheme()` in `apps/web/src/App.jsx`.

Keep the app wrapped in MUI `ThemeProvider`; the public demo depends on that stack.

## Seed data

Seed data lives in `db/scripts/seed.js`.

Change this file when you want different demo users, players, leagues, fantasy teams, squads, starting leaderboard entries, or the seeded match.

After editing seed data, run against your configured `DATABASE_URL`:

```sh
pnpm db:seed
```

If you need a clean hosted database, reset requires the explicit safety flag:

```sh
ALLOW_DB_RESET=true pnpm db:reset --seed
```

Do not manually create demo rows in the Neon dashboard. Migrations and seed scripts are the source of truth.

## Scoring rules

The v1 scoring rules live in `packages/shared/scoring-rules.js`:

```js
export const DEFAULT_SCORING_RULES = Object.freeze({
  eventPoints: Object.freeze({
    goal: 5,
    assist: 3,
    yellow_card: -1
  }),
  captainMultiplier: 2
});
```

Backend scoring code imports those rules from `@ably-fantasy-world-cup/shared/scoring-rules`.

If you change scoring values, update the Node.js built-in tests in `backend/src/scoring/*.test.js` and run:

```sh
pnpm test
```

For v1, keep scoring limited to `goal`, `assist`, `yellow_card`, and the captain multiplier unless you intentionally expand the schema, simulator payloads, docs, and tests.

## Domain remapping

You can rename the demo from fantasy football to another event-driven domain, but keep the same ownership model:

- simulator actions are inputs
- the backend calculates authoritative state
- Postgres stores confirmed state
- LiveSync publishes committed outbox messages
- React renders received state

Common remaps:

| Current concept | Example replacement |
| --- | --- |
| Match event | Race lap, auction bid, quiz answer, delivery scan |
| Player | Driver, bidder, contestant, courier |
| Fantasy team | Watchlist, portfolio, squad, account |
| League leaderboard | Ranking, standings, scoreboard |
| Activity feed | Timeline, audit feed, event log |

Start with copy and seed data. Rename database tables only when the existing schema cannot represent the new domain. If you rename schema objects, add migrations in `db/migrations` and update API queries and tests in the same PR.

LiveSync channel and event names are part of the demo contract. If you remap them, update backend outbox writes, frontend subscriptions, docs, and tests together.

Current channel patterns:

```text
league:{leagueSlug}:leaderboard
league:{leagueSlug}:activity
league:{leagueSlug}:teams
match:{matchSlug}
```

Current event names:

```text
leaderboard.updated
activity.created
team.updated
match.updated
```

Client pages subscribe to the league-scoped teams channel and apply only
`team.updated` messages whose payload `userSlug` matches the current client.

## Fork checklist

1. Update `APP_NAME` and `createAppTheme()`.
2. Update `db/scripts/seed.js`.
3. Adjust `packages/shared/scoring-rules.js` only if scoring changes.
4. Update in-app route labels and copy in `apps/web/src/App.jsx`.
5. Run `pnpm lint` and `pnpm test`.
6. Run `pnpm db:migrate`, `pnpm db:seed`, then verify LiveSync with the Ably-hosted connector.
