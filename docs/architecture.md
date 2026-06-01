# Architecture

This reference app keeps Postgres as the source of truth.

Runtime flow:

1. Simulated match events are submitted to Netlify Functions through `/api/...` redirects.
2. Functions validate events with Zod.
3. Function transactions update app tables and LiveSync outbox records together.
4. Ably LiveSync publishes database-confirmed changes.
5. React clients render synced state without calculating fantasy scores or leaderboard rankings.

## Simulated event processing

The simulator represents an upstream sports data source. It is intentionally
local and deterministic for the demo.

`POST /api/simulator/events` accepts a simulated match event, validates it with
Zod, and processes it in one backend transaction:

simulated match event -> Netlify Function -> backend scoring -> Postgres state update -> LiveSync
outbox rows -> future LiveSync client updates

The backend owns fantasy scoring, fantasy team score updates, leaderboard
ranking, activity feed generation, and LiveSync outbox writes. React clients
render database-confirmed state and do not calculate authoritative scores or
ranks.

Each successful simulator event writes model updates for the affected realtime
views in the same transaction: `match.updated`, `leaderboard.updated`,
`activity.created`, and one `team.updated` per affected fantasy team owner.
Team updates are published on `league:{leagueSlug}:teams`; client pages filter
those messages by payload `userSlug`. All outbox rows for that simulator event
share the same `simulator:<match_event_id>` mutation id.
