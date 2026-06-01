# Development

Use pnpm from the repository root.

```sh
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm test
pnpm dev
```

`pnpm dev` runs `netlify dev`, which serves the Vite frontend and Netlify Functions together. The frontend should use same-origin `/api/...` paths

Set `DATABASE_URL` to a Neon Postgres connection string and `ABLY_API_KEY` to a server-side Ably key before starting the app. LiveSync is required for the demo; HTTP is only used for initial reads and simulator actions.

Keep scoring and leaderboard ownership in the backend. The frontend should render synced state only.
