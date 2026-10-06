# ReadTraining

pnpm + Turbo monorepo: Express + tRPC API and Next.js web.

```
apps/api   Express server, tRPC at /api/trpc (port 4000)
apps/web   Next.js App Router, tRPC React Query client (port 3000)
```

```bash
pnpm install
pnpm dev        # runs api + web
pnpm dev:api    # only API (port 4000)
pnpm dev:web    # only Next.js (port 3000)
```

The web app imports only the `AppRouter` **type** from `@readtraining/api`, giving end-to-end type safety.

## Database (Supabase + Drizzle)

Copy `.env.example` to `.env` and fill in the Supabase values.

```bash
pnpm db:generate   # schema.ts changed -> new SQL migration in packages/db/migrations
pnpm db:migrate    # apply migrations to Supabase
pnpm db:studio     # browse data
```

Schema lives in `packages/db/src/schema.ts`. Commit the migration files.

## Deploying (Vercel Services)

One Vercel project deploys both apps from `vercel.json`: `/api/*` goes to the API, everything else to the web app.

- Project Root Directory: the repo root (blank).
- Environment variables: `DATABASE_URL` (transaction pooler, port 6543), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Do not set `NEXT_PUBLIC_API_URL`.
- Check the API at `/api/trpc/health`.
