# Setup Ably LiveSync

The Ably-hosted Postgres connector must read from the same Neon database that the API writes to through `DATABASE_URL`.

## Order

1. Create the Neon database.
2. Set `DATABASE_URL` locally.
3. Run migrations.

```sh
pnpm db:migrate
```

4. Run seed data.

```sh
pnpm db:seed
```

5. Verify the required objects.

```sh
pnpm db:inspect
```

Required connector objects:

- `public.outbox`
- `public.nodes`
- `public.outbox_notify()`
- `public_outbox_trigger`

6. Create an Ably app and copy a server-side API key to `ABLY_API_KEY`.
7. Configure the Ably-hosted Postgres connector against the same Neon database.
8. Start the API and frontend.

```sh
pnpm dev:api
pnpm dev:web
```

9. Trigger a simulator event and confirm browser clients receive updates through Ably.

Do not create LiveSync tables manually in Neon. `db/migrations` is the schema source of truth.
