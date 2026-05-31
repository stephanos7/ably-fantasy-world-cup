# Ably LiveSync

This app is intended to demonstrate Ably LiveSync with a Postgres connector.

The `db/migrations/001_initial_schema.sql` migration includes the official Ably LiveSync Postgres connector schema for `public.nodes`, `public.outbox`, `public.outbox_notify()`, and `public_outbox_trigger`.
This schema is aligned with the Ably docs at https://ably.com/docs/livesync/postgres.md checked on 2026-05-31.
