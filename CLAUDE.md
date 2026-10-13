# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

pnpm + Turbo monorepo. Run these from the repo root:

```bash
pnpm install
pnpm dev          # api (4000) + web (3000)
pnpm dev:api      # Express + tRPC only, http://localhost:4000/trpc
pnpm dev:web      # Next.js only, http://localhost:3000
pnpm build
pnpm typecheck    # tsc --noEmit in every package (the only static check)

pnpm db:generate  # after editing packages/db/src/schema.ts, writes SQL to packages/db/migrations (commit it)
pnpm db:migrate   # apply migrations to Supabase
pnpm db:push      # push schema directly, no migration
pnpm db:studio
```

To run a command in one package, use `pnpm --filter @readtraining/<api|web|db> <script>`. The repo has no lint or test scripts. `playwright-core` is a devDependency of web, and the QA under `qa-report/` was done by driving a browser against the dev server.

Env: copy `.env.example` to `.env` at the repo root. The API loads it through `tsx --env-file-if-exists=../../.env`, and drizzle-kit loads it through dotenv. `DATABASE_URL` is the Supabase transaction pooler (6543) and is used at runtime. `DIRECT_URL` (5432) is used for migrations.

## Architecture

- **packages/db**: Drizzle schema plus `createDb(url)`. It uses `prepare: false`, which the Supabase transaction pooler requires. It also re-exports `drizzle-orm`, so import operators like `eq` and `desc` from `@readtraining/db`. Packages are consumed as TS source (`exports` → `src/*.ts`), so nothing needs building.
- **apps/api**: ESM TypeScript. Relative imports use `.js` extensions. `src/trpc/trpc.ts` defines `createTRPCRouter`, `publicProcedure` and `protectedProcedure` (superjson transformer, zod errors flattened into `data.zodError`). The context (`src/trpc/context.ts`) holds `db` and a demo `user` read from `Authorization: Bearer <userId>`. Feature routers go in `src/modules/<name>/<name>.router.ts` and are mounted in `src/trpc/router.ts`. Right now only `health` and `posts` exist. `src/lib/supabase.ts` is a server-only admin client (null when env is missing), and DB queries go through Drizzle.
- **apps/web**: Next.js 16 App Router, React 19. It is mostly `.jsx`; TS is used only for the tRPC client. It imports only the `AppRouter` **type** from `@readtraining/api` (`lib/trpc/react.ts`), so API code never enters the bundle. `TRPCProvider` and the cart `Context` (`context/Context.js`, persisted to localStorage under `rt-cart`) wrap the whole app in `app/layout.jsx`, which is a client component. Path alias `@/*` → `apps/web/*`.

### The web app is built on the "Educrat" template

- `app/template/**` and most of `components/` and `data/` are the original purchased template, with lorem ipsum and demo pages. The real ReadTraining pages are `app/page.jsx` (home), `for-business`, `for-providers`, `admin`, the course listing (`template/(coursesList)/courses-list-1` → `components/courses/CourseCatalogue.jsx`) and the course detail page `template/(courseSingle)/courses/[id]/page.jsx` (`components/courseDetail/*`). These keep their template routes because every card links there.
- **The web app does not use the API for real data yet.** Course data is dummy data in `data/courseCatalogue.js`: the filter model, `catalogueCourses` and `buildCourseDetail`. Course detail reads go through `lib/courses.js` (`getCourseBySlug` accepts a slug or a numeric id, plus the shared `en-GB`/GBP/UTC formatters). Those functions are meant to be swapped for API calls later, so new reads go there instead of importing data directly. `lib/quote.js` simulates the quote submission because no endpoint exists yet.
- Course detail page: `BookingProvider` holds the selected mode, session and quantity, and syncs it to URL query params (e.g. `?mode=inhouse`, `?dates=open`). The booking card, mobile buy bar and sections read from it. Team/group wording lives only in `lib/teamTraining.js`, so all surfaces show the same text. Analytics events go through `lib/analytics.js` (`trackEvent`, GA4 dataLayer).
- Styling uses Bootstrap plus the template's compiled CSS (`public/assets/css/main.css`), imported by `public/assets/sass/styles.scss`. All ReadTraining styling goes in `public/assets/sass/custom.scss` with `rt-` prefixed BEM-ish classes (`rt-cd__*` for course detail, `rt-home`, `rt-card`, etc.). Don't edit the template CSS.
- Copy is UK English (`lang="en-GB"`, GBP).
