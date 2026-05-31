# Architecture

This reference app will keep Postgres as the source of truth.

Planned flow:

1. Simulated match events are submitted to the API.
2. The backend validates events with Zod.
3. Backend transactions update app tables and LiveSync outbox records together.
4. Ably LiveSync publishes database-confirmed changes.
5. React clients render synced state without calculating fantasy scores or leaderboard rankings.

No product functionality has been implemented yet.
