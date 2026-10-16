// Adds, changes or removes a platform admin. There is no admin sign-up, so the first admin is made here; later admins are
// managed in the admin panel (Part B). The person must already have a ReadTraining account (sign up on the site first).
//
//   pnpm admin:grant <email>                       make them a Full admin (two-step sign-in is set up at their first admin login)
//   pnpm admin:grant <email> --preset support      Full, Support or Finance (see packages/permissions)
//   pnpm admin:grant <email> --revoke              turn their admin access off
//   pnpm admin:grant <email> --reset-two-step      remove their authenticator (a lost phone); they set up a new one at next login
//   pnpm admin:grant --list                        everyone with an admin row
//
// Uses the database and Supabase settings in the root .env, so it acts on whichever project that file points at.
// Every change is written to the activity log as a system action.
import { activityLog, adminUsers, eq, sql } from '@readtraining/db'

import { db } from '../lib/db.mjs'
import { supabase } from '../lib/supabase.mjs'

const PRESETS = ['full', 'support', 'finance'] as const
type Preset = (typeof PRESETS)[number]

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const option = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const email = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--preset')?.trim().toLowerCase()

function stop(message: string): never {
  console.error(message)
  process.exit(1)
}

async function log(action: string, userId: string, metadata: Record<string, unknown>) {
  await db.insert(activityLog).values({ actorUserId: null, actorIdentity: 'system', action, targetType: 'account', targetId: userId, metadata: { ...metadata, via: 'admin:grant' } })
}

async function main() {
  if (flag('list')) {
    const rows = await db.execute<{ email: string; preset: string; active: boolean; two_step: boolean }>(sql`
      select u.email, a.preset, a.active,
             exists (select 1 from auth.mfa_factors f where f.user_id = a.user_id and f.status = 'verified') as two_step
      from public.admin_users a join auth.users u on u.id = a.user_id
      order by u.email`)
    if (!rows.length) console.log('No admins yet.')
    for (const r of rows) console.log(`${r.email}  ${r.preset}  ${r.active ? 'active' : 'off'}  two-step ${r.two_step ? 'set up' : 'not set up'}`)
    return
  }

  if (!email) stop('Give the email of an existing account, for example: pnpm admin:grant name@example.com')
  const [user] = await db.execute<{ id: string }>(sql`select id from auth.users where lower(email) = ${email} and deleted_at is null`)
  if (!user) stop(`No account uses ${email}. Ask them to sign up on the site first, then run this again.`)

  if (flag('revoke')) {
    const done = await db.update(adminUsers).set({ active: false }).where(eq(adminUsers.userId, user.id)).returning({ userId: adminUsers.userId })
    if (!done.length) stop(`${email} is not an admin.`)
    await log('admin.revoked', user.id, {})
    console.log(`${email} can no longer open the admin panel.`)
    return
  }

  if (flag('reset-two-step')) {
    if (!supabase) stop('SUPABASE_SERVICE_ROLE_KEY is missing from .env.')
    const factors = await supabase.auth.admin.mfa.listFactors({ userId: user.id })
    if (factors.error) stop(factors.error.message)
    for (const f of factors.data.factors) {
      const r = await supabase.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id })
      if (r.error) stop(r.error.message)
    }
    await log('admin.two_step_reset', user.id, { removed: factors.data.factors.length })
    console.log(`Removed ${factors.data.factors.length} authenticator(s) for ${email}. They set up a new one at their next admin login.`)
    return
  }

  const preset = (option('preset') ?? 'full') as Preset
  if (!PRESETS.includes(preset)) stop(`--preset must be one of: ${PRESETS.join(', ')}`)
  await db
    .insert(adminUsers)
    .values({ userId: user.id, preset, active: true })
    .onConflictDoUpdate({ target: adminUsers.userId, set: { preset, active: true } })
  await log('admin.granted', user.id, { preset })
  console.log(`${email} is now a ${preset} admin. They sign in at /admin/login${preset === 'full' ? ' and set up two-step sign-in the first time' : ''}.`)
}

main()
  .catch((e) => stop(e instanceof Error ? e.message : String(e)))
  .finally(() => process.exit(process.exitCode ?? 0))
