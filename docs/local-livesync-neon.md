# Neon + Ably LiveSync

This is the supported runtime path for the app. The React app and Express API may run locally, but Postgres must be internet-reachable so the Ably-hosted LiveSync Postgres connector can access it.

## Required Flow

```text
local React app
-> local Express API
-> Neon Postgres
-> Ably-hosted LiveSync Postgres connector
-> Ably
-> browser clients
```

Neon is documented because it provides an internet-reachable Postgres database. The application code only requires `DATABASE_URL` and works with compatible Postgres databases reachable by the Ably-hosted connector.

## Setup

1. Create a Neon database.
2. Set `DATABASE_URL` to the Neon connection string.

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

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

6. Create an Ably app and copy a server-side API key into `.env`.

```env
ABLY_API_KEY=your-ably-api-key
```

7. Configure the Ably-hosted Postgres connector against the same Neon database used by the API.

The connector expects these objects to already exist:

- `public.outbox`
- `public.nodes`
- `public.outbox_notify()`
- `public_outbox_trigger`

Run migrations before configuring or testing the connector. Do not create these objects manually in the Neon dashboard.

8. Start the API and frontend.

```sh
pnpm dev:api
pnpm dev:web
```

9. Open:

```text
http://localhost:5173/control-room
http://localhost:5173/league/friends
http://localhost:5173/client/stephanos
http://localhost:5173/tv/friends
```

10. Click `Mbappé goal` in the control room and confirm the other tabs update without refresh.

## Runtime Behavior

HTTP is still used for:

- initial leaderboard, activity, team, and match reads
- simulator actions from the control room

Live updates must come through Ably LiveSync. Do not use polling to fake realtime behavior.
