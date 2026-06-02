# Ably LiveSync

This app is intended to demonstrate Ably LiveSync with a Postgres connector.

The `db/migrations/001_initial_schema.sql` migration includes the official Ably LiveSync Postgres connector schema for `public.nodes`, `public.outbox`, `public.outbox_notify()`, and `public_outbox_trigger`.
This schema is aligned with the Ably docs at https://ably.com/docs/livesync/postgres.md checked on 2026-05-31.

For local browser testing with the Ably-hosted connector, use an internet-reachable Postgres database such as Neon and follow [Neon + Ably LiveSync](local-livesync-neon.md).

The Ably-hosted connector must point to the same database as the Netlify Functions backend. Run `pnpm db:migrate` and `pnpm db:seed` before configuring or testing the connector so the LiveSync schema, app tables, and seeded demo rows exist.

The frontend loads initial state over HTTP and then subscribes to Ably channels. It does not poll and does not calculate authoritative scores or ranks.

Client team updates use the league-scoped `league:{leagueSlug}:teams` channel.
Each `team.updated` payload includes `userSlug`, and client pages ignore updates
for other users.
