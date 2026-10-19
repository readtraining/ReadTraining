# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

pnpm + Turbo monorepo. Run these from the repo root:

```bash
pnpm install
pnpm dev          # api (4000) + web (3000)
pnpm dev:api      # builds packages/db, then Express + tRPC at http://localhost:4000/api/trpc
pnpm dev:web      # Next.js only, http://localhost:3000
pnpm build
pnpm typecheck    # tsc --noEmit in every package (the only static check)

pnpm db:generate  # after editing packages/db/src/schema.ts, writes SQL to packages/db/migrations (commit it)
pnpm db:migrate   # apply migrations to Supabase
pnpm db:push      # push schema directly, no migration
pnpm db:studio

pnpm admin:grant <email> [--preset support|finance|--revoke|--reset-two-step|--list]   # admins (no sign-up)
pnpm live <command>     # run a command against the live project (LIVE_* in .env), e.g. pnpm live db:migrate
```

The Supabase dashboard settings every project needs (auth, SMTP, email templates, redirect URLs) are listed in `supabase/README.md`; the email templates are in `supabase/templates/`.

To run a command in one package, use `pnpm --filter @readtraining/<api|web|db> <script>`. The repo has no lint or test scripts. `playwright-core` is a devDependency of web, and QA is done by driving a browser against the dev server.

Env: copy `.env.example` to `.env` at the repo root. The API loads it through `tsx --env-file-if-exists=../../.env`, and drizzle-kit loads it through dotenv. `DATABASE_URL` is the Supabase transaction pooler (6543) and is used at runtime. `DIRECT_URL` (5432) is used for migrations. The web app reads the same root `.env` through `loadEnvConfig` in `next.config.ts` and inlines `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the edge `proxy.js` can't read the root file).

Deploy: one Vercel project (`vercel.json`, Vercel Services). `/api/*` goes to the API service and everything else to the web app. Health check: `/api/trpc/health`.

## Architecture

- **packages/db**: Drizzle schema plus `createDb(url)`. It uses `prepare: false`, which the Supabase transaction pooler requires. It also re-exports `drizzle-orm`, so import operators like `eq` and `desc` from `@readtraining/db`. Types come from `src/index.ts`, but the runtime export is `dist/index.js`, so the package has to be built (`dev:api` does it) after schema or source changes.
- **apps/api**: ESM TypeScript with `.mts` files. Relative imports use `.mjs` extensions. The package exports `src/trpc/index.mts` (the `AppRouter` type). `src/trpc/trpc.mts` defines `createTRPCRouter`, `publicProcedure` and `protectedProcedure` (superjson transformer, zod errors flattened into `data.zodError`). The context (`src/trpc/context.mts`) holds `db` and a demo `user` read from `Authorization: Bearer <userId>`. Feature routers go in `src/modules/<name>/<name>.router.mts` and are mounted in `src/trpc/router.mts`. Mounted routers: `health`, `posts`, `me`, `organisations`, `catalogue`, `content` and `admin` (which holds the admin's own sub-routers). `src/lib/supabase.mts` is a server-only admin client (null when env is missing), and DB queries go through Drizzle.
- **apps/web**: Next.js 16 App Router, React 19. It is mostly `.jsx`; TS is used only for the tRPC client. It imports only the `AppRouter` **type** from `@readtraining/api` (`lib/trpc/react.ts`), so API code never enters the bundle. `app/layout.jsx` is a server component with the site-wide metadata; `app/Providers.jsx` (client) holds `TRPCProvider`, the cart `Context` (`context/Context.js`, persisted to localStorage under `rt-cart`) and the AOS animations. `app/sitemap.js`, `app/robots.js`, `app/error.jsx` and `app/global-error.jsx` exist. Path alias `@/*` → `apps/web/*`.

### The web app is built on the "Educrat" template

- `app/template/**` and most of `components/` and `data/` are the original purchased template, with lorem ipsum and demo pages. Every route outside `app/template/**` is a real ReadTraining page. The course listing is `/courses` (`components/courses/CourseCatalogue.jsx`), the subject/method pages `/courses/[slug]`, and course detail `/course/[slug]` (`components/courseDetail/*`; a numeric id redirects to the slug). Shop routes and auth routes are constants in `lib/routes.js`; the old `/template/...` addresses 308-redirect in `next.config.ts`. The template demo pages stay until launch: don't link to them from real pages.
- **The web app does not use the API for real data yet.** Course data is dummy data in `data/courseCatalogue.js`: the filter model, `catalogueCourses` and `buildCourseDetail`. Course detail reads go through `lib/courses.js` (`getCourseBySlug` accepts a slug or a numeric id, plus the shared `en-GB`/GBP/UTC formatters). Those functions are meant to be swapped for API calls later, so new reads go there instead of importing data directly. Browser components must not import `lib/courses.js` just for helpers (it loads the 78 KB catalogue): formatters come from `lib/format.js`, course links from `data/courseSlugs.js` (`courseHref`, `courseLink`), booking modes from `lib/courseModes.js`. `lib/quote.js` simulates the quote submission because no endpoint exists yet.
- Course detail page: `BookingProvider` holds the selected mode, session and quantity, and syncs it to URL query params (e.g. `?mode=inhouse`, `?dates=open`). The booking card, mobile buy bar and sections read from it. Team/group wording lives only in `lib/teamTraining.js`, so all surfaces show the same text. Analytics events go through `lib/analytics.js` (`trackEvent`, GA4 dataLayer).
- Styling uses Bootstrap plus the template's compiled CSS (`public/assets/css/main.css`), imported by `public/assets/sass/styles.scss`. All ReadTraining styling goes in `public/assets/sass/custom.scss` with `rt-` prefixed BEM-ish classes (`rt-cd__*` for course detail, `rt-home`, `rt-card`, etc.). Don't edit the template CSS. **New pages and components follow `apps/web/DESIGN-SYSTEM.md`** (tokens in the `DESIGN TOKENS` block of custom.scss): no hex values, one type scale per page type, the shared layout parts and `.rt-field` forms.
- Copy is UK English (`lang="en-GB"`, GBP).

### Accounts, provider workspace and admin

- **Auth is Supabase Auth in the web app**, not the API: `lib/supabase/{client,server}.js`, `lib/auth/*`, and `proxy.js` (Next 16's name for middleware). The proxy refreshes the session cookie, sends signed-out visitors of `/account`, `/business` and `/provider` to `/login?next=…`, and sends signed-in visitors away from `/login` and `/signup`. Pages still check the session themselves. With no Supabase env, protected areas redirect to login and the rest of the site works.
- `/account` (learner), `/business` (business account) and `/provider/*` (provider workspace, modelled on Hurak's provider side; `lib/providerWorkspace.js`) are mostly front end only: their records are demo data in `data/` plus localStorage. Their real parts are the account's settings, the organisations, and a provider's status banner. `/admin/*` (operator panel) is part real, part demo (Part B of `docs/milestone-1-and-admin.md`):
  - **Real (API `admin.*`, `content.*`):** admin team, activity log, learners, providers and approvals (decisions email the owner), commission, catalogue settings (categories, methods, levels), site content, emails (every automated email's words: `apps/api/src/emails/templates.mts`, saved as content keys `email:<template>`, never sent to the website), coupons (`coupons` table), money (orders, refunds, disputes, payouts and the append-only `ledger_entries`, in `modules/admin/money.mts` and `payouts.mts`; the maths is `apps/api/src/lib/money.mts`: fee off the gross, commission on the net, amounts in pence; no payment provider yet, so orders come from staff bookings and refunds/payouts are recorded, not paid; `pnpm --filter @readtraining/api seed:money` adds made-up records to a dev database, never live) and platform settings (the search-engine words, content key `seo`, and which outside services' environment variables are set; their values never leave the server). Each has its own router in `apps/api/src/modules/admin/` (and `modules/content/`), checks one switch with `adminProcedure(...)`, and writes `activity_log`.
  - **Still demo:** sessions, change requests, requests, businesses, Security Jobs, certificates, reports, reviews (`lib/adminReviews.js`) and the fees preview. Demo pages say so beside their title (the nav's `demo` in `data/admin.js`; `AccountShell`'s `demo` for the learner and business accounts). These go through `lib/adminStore.js` (one `rt-admin` record and an `rt-admin-change` event), which `lib/admin.js` and `lib/adminWork.js` build on; they are the seam to swap for API calls.
  - **Site content** (admin > Site content) is the editable part of the public site: the trust numbers, the home page's featured courses, testimonials, the video words, each page's FAQs and the legal pages. The key/value rows are `site_content` (every save is also kept in the append-only `site_content_versions`). The website reads them through `lib/siteContent.js` (`await loadSiteContent()` from `lib/siteContentServer.js` first, on the server): a key never saved uses the built-in wording in `data/`, so the site reads the same until an admin changes something. A page's FAQ is `faqItems(key, builtInItems)` and must also be listed in `data/faqSets.js`; the legal pages read through `lib/legal.js`; the browser only receives the trust numbers (`browserContent`). A change marks the saved copy out of date (`app/admin/actions.js`, `updateTag`), and the root layout's `revalidate = 300` makes prebuilt pages catch up within 5 minutes. Never retype a number the trust numbers hold; use `trustFigures()`.

## Database rules (Supabase + Drizzle)

The schema is built on a development Supabase project and replayed later on the client's test and live projects, so the migrations must rebuild everything from an empty database.

- Every change goes `packages/db/src/schema.ts` → `pnpm db:generate` → `pnpm db:migrate`. Never change tables in the Supabase dashboard, and never use `db:push` on a shared or client database.
- Never edit a migration that has already run. A fix is always a new migration.
- Supabase-specific SQL (triggers on `auth.users`, RLS policies, grants, storage buckets, extensions) goes in custom migrations (`drizzle-kit generate --custom --name <name>`), not in the dashboard.
- No demo or test data in migrations. Seed data goes in a separate script that never runs on live.
- Every public table calls `.enableRLS()`. Drizzle connects as `postgres` and skips RLS, but the Data API is reachable with the public key, so RLS is what protects it. Policies are owner-only reads using `(select auth.uid())`; writes go through the API.
- Database functions are `security definer` with `set search_path = ''`.
- Append-only tables (`activity_log`, `site_content_versions`, `ledger_entries`) have no foreign keys, so removing an account never has to change a row, and a trigger blocks update, delete and truncate.
- Run the Supabase security and performance advisors after each migration. Before moving to the client, apply all migrations to a fresh, empty project first.

## Sign-in and security rules

- On the server, verify the user with `supabase.auth.getClaims()` (it checks the JWT signature locally), never `getSession()`. Use `getUser()` only when fresh user data is needed.
- Only the publishable key reaches the browser. The service-role key stays in the API, for admin tasks only.
- Email links (confirm, reset) use the token-hash flow at `/auth/confirm`. Google/Facebook use `/auth/callback` (PKCE code exchange).
- A `next` redirect is accepted only if it starts with `/` and not `//`.
- Forgot password always shows the same message, so it never reveals whether an email exists.
- Changing email or password requires the current password.
- The tRPC client sends `Authorization: Bearer <access_token>`, and the API verifies it with `getClaims(token)`. Today `context.mts` still trusts a demo header; that is to be replaced.

## Identities, roles and permissions

One login can hold several identities:
- Student: every account.
- Business and Provider: an `organisations` row with `organisation_members`.
- Admin: an `admin_users` row, signed in at `/admin/login`, with no public sign-up.

Roles:
- Provider roles follow Hurak: owner, admin, tutor, course_editor, support, sales, accounts, marketing, assistant.
- Business roles: owner, member.
- Admins have one role with permission switches and presets (Full, Support, Finance). Full requires two-step sign-in.

How permissions are checked:
- One shared `can(actor, action, target)` table, used by both the API and the web server code.
- It is enforced on the server: in tRPC procedures (signed in, organisation member, admin permission) and in the server layouts for `/provider`, `/business` and `/admin`. The browser uses it only to hide buttons.
- Provider staff only ever see their own organisation's data.
- Every allowed change and every refused attempt is written to `activity_log`, which is append-only (no update or delete).
