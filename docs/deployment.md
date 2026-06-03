# Deployment

The app deploys as one Netlify site:

- React/Vite frontend
- Netlify Functions backend
- Neon Postgres or another internet-reachable compatible Postgres database
- Ably-hosted LiveSync Postgres connector
- Ably browser subscriptions using function-issued token requests

## Environment Variables

Set these on the Netlify site:

- `DATABASE_URL`
- `ABLY_API_KEY`

The frontend does not require `VITE_API_BASE_URL` by default. Same-origin `/api/...` routes are served by Netlify Functions through redirects in `netlify.toml`.

## Steps

1. Create the Neon database.
2. Set `DATABASE_URL` locally using the direct Neon host, not the Neon `-pooler` host.
3. Run `pnpm db:migrate`.
4. Run `pnpm db:seed`.
5. Create an Ably app.
6. Configure the Ably-hosted LiveSync Postgres connector against the same direct Neon database. Do not use the Neon `-pooler` host for the connector URL.
7. Set `DATABASE_URL` and `ABLY_API_KEY` in Netlify environment variables.
8. Deploy the Netlify site.
9. Trigger a simulator event and verify LiveSync updates in multiple browser windows.

`netlify.toml` defines the frontend build, Functions directory, same-origin `/api` redirects, `/health`, and the SPA fallback.

Do not expose `ABLY_API_KEY` to the browser. The browser must request Ably auth material from `/api/ably/token`.

## Production Smoke Test

1. Open `/control-room` and `/league/friends`.
2. Trigger `Mbappé goal`.
3. Confirm `/league/friends` updates without refresh.
4. Open `/client/stephanos`.
5. Trigger an event that affects Stephanos.
6. Confirm points update without refresh.
7. Open the Ably dashboard and confirm `league:friends:teams` receives `team.updated`.

## What Not To Deploy

- No separate backend site.
- No Render backend.
- No Docker Postgres runtime path.
- No HTTP-only demo mode.
- No standalone Express service.
