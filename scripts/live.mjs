// Runs one of the repo's commands against the LIVE Supabase project instead of development, using the LIVE_ values in the
// root .env (never committed). The command's own .env loading doesn't override these, because values already set win.
//
//   pnpm live db:migrate                     apply the migrations to live
//   pnpm live admin:bootstrap name@example.com   invite the first live super admin
//
// Needs in .env: LIVE_SUPABASE_URL, LIVE_PUBLISHABLE_KEY, LIVE_SERVICE_ROLE_KEY, LIVE_DATABASE_URL (pooler, 6543) and
// LIVE_DIRECT_URL (5432). Refuses to run if any is missing, or if a LIVE_ value points at the development project.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^"|"$/g, '')]),
)
const need = ['LIVE_SUPABASE_URL', 'LIVE_PUBLISHABLE_KEY', 'LIVE_SERVICE_ROLE_KEY', 'LIVE_DATABASE_URL', 'LIVE_DIRECT_URL']
const missing = need.filter((k) => !env[k])
if (missing.length) {
  console.error(`Add these to the root .env first: ${missing.join(', ')}`)
  process.exit(1)
}
if (env.LIVE_SUPABASE_URL === env.NEXT_PUBLIC_SUPABASE_URL || env.LIVE_DIRECT_URL === env.DIRECT_URL) {
  console.error('The LIVE_ values point at the development project. Use the readtraining-live project\'s values.')
  process.exit(1)
}
const args = process.argv.slice(2)
if (!args.length) {
  console.error('Say which command to run, for example: pnpm live db:migrate')
  process.exit(1)
}
console.log(`Running "pnpm ${args.join(' ')}" against LIVE (${new URL(env.LIVE_SUPABASE_URL).host})`)
const result = spawnSync('pnpm', args, {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: env.LIVE_SUPABASE_URL,
    SUPABASE_URL: env.LIVE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.LIVE_PUBLISHABLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: env.LIVE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.LIVE_SERVICE_ROLE_KEY,
    DATABASE_URL: env.LIVE_DATABASE_URL,
    DIRECT_URL: env.LIVE_DIRECT_URL,
    // links in emails the API writes (admin invites) point at the live site
    NEXT_PUBLIC_SITE_URL: env.LIVE_SITE_URL || 'https://readtraining.vercel.app',
  },
})
process.exit(result.status ?? 1)
