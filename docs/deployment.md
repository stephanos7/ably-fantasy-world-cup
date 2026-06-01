# Deployment

The app is designed around one runtime path:

- React web deployment
- Node API deployment
- Neon Postgres or another internet-reachable compatible Postgres database
- Ably-hosted LiveSync Postgres connector
- Ably browser subscriptions using API-issued token requests

Run `pnpm db:migrate` and `pnpm db:seed` against the deployment database before testing LiveSync. Configure the Ably-hosted connector against that same database.

Do not expose `ABLY_API_KEY` to the browser. The browser must request Ably auth material from `/api/ably/token`.
