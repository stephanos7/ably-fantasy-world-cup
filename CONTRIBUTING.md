# Contributing

This repository is a public demo app. Keep changes small, reviewable, and aligned with the documented Netlify + Neon + Ably LiveSync path.

## Before You Start

1. Fork the repository or create a feature branch.
2. Install dependencies with `pnpm install`.
3. Run `pnpm db:migrate` and `pnpm db:seed` against your local Neon-compatible database.
4. Run `pnpm lint` and `pnpm test` before opening a pull request.

## What To Preserve

- Backend-owned scoring and leaderboard ranking.
- Postgres as the source of truth.
- LiveSync outbox writes in the same transaction as state changes.
- The seeded demo channels and event names.

## Pull Requests

- Keep PRs focused on one change.
- Update docs when behavior changes.
- Include tests for backend or scoring changes.
- Do not commit secrets or browser-exposed Ably credentials.

## Good Fork Changes

- Theme and branding updates.
- Seed data changes.
- Documentation improvements.
- Small copy changes that make the demo easier to understand.
