# Deployment

The app deploys as one Netlify site:

- React/Vite frontend
- Netlify Functions backend
- Neon Postgres or another internet-reachable compatible Postgres database
- Ably-hosted LiveSync Postgres connector
- Ably browser subscriptions using function-issued token requests

## Steps

1. Create the Neon database.
2. Set `DATABASE_URL` locally.
3. Run `pnpm db:migrate`.
4. Run `pnpm db:seed`.
5. Create an Ably app.
6. Configure the Ably-hosted LiveSync Postgres connector against the same Neon database.
7. Set `DATABASE_URL` and `ABLY_API_KEY` in Netlify environment variables.
8. Deploy the Netlify site.
9. Trigger a simulator event and verify LiveSync updates in multiple browser windows.

`netlify.toml` defines the frontend build, Functions directory, API redirects, `/health`, and the SPA fallback.

Do not expose `ABLY_API_KEY` to the browser. The browser must request Ably auth material from `/api/ably/token`.
