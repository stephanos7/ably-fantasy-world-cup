# Neon + Ably LiveSync

This app has one supported runtime path: Netlify frontend and Functions, Neon Postgres, and the Ably-hosted LiveSync Postgres connector.

## Required Flow

```text
React/Vite frontend
-> Netlify Functions
-> Neon Postgres
-> Ably-hosted LiveSync Postgres connector
-> Ably
-> browser clients
```

Neon is documented because it provides an internet-reachable Postgres database. The application code reads `DATABASE_URL` and works with compatible Postgres databases reachable by the Ably-hosted connector.

## Setup

1. Create a Neon database.
2. Set `DATABASE_URL` to the direct Neon connection string .

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

Do not use the Neon `-pooler` hostname for this app's `DATABASE_URL`. Use the direct Neon host so the app runtime, migrations, seed scripts, and Ably-hosted connector all target the same database path.

3. Run migrations. This creates the app tables and the LiveSync connector objects.

```sh
pnpm db:migrate
```

4. Seed demo data. This creates league `friends`, match `france-england`, demo users, fantasy teams, players, and captain/non-captain ownership cases.

```sh
pnpm db:seed
```

5. Verify the database.

```sh
pnpm db:inspect
```

6. Create an Ably app and copy a server-side Ably key into `.env`.

```env
ABLY_API_KEY=your-ably-api-key
```

7. Configure the Ably-hosted Postgres connector against the same direct Neon database used by Netlify Functions. Do not point the connector at the Neon `-pooler` host.

The connector expects these objects to already exist:

- `public.outbox`
- `public.nodes`
- `public.outbox_notify()`
- `public_outbox_trigger`

Run migrations before configuring or testing the connector. Do not create these objects manually in the Neon dashboard.

8. Start Netlify dev.

```sh
pnpm dev
```

9. Open the local Netlify dev URL and visit:

```text
/control-room
/league/friends
/client/stephanos
/tv/friends
```

10. Click `Mbappé goal` in the control room and confirm the other tabs update without refresh.

## Runtime Behavior

HTTP is used for initial leaderboard, activity, team, and match reads and for simulator actions from the control room. These requests go to `/api/...` and are served by Netlify Functions through `netlify.toml` redirects.

Live updates must come through Ably LiveSync. Do not use polling to fake realtime behavior.
