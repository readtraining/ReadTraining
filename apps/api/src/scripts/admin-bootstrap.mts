// Makes the platform's first super admin, once. There is no admin sign-up: this creates a staff-only login for the email (no
// password) and sends the invite email; the person sets their name and password from the link, and their access starts then.
// Everyone after them is invited from Admin › Team.
//
//   pnpm admin:bootstrap <email>            make the first super admin and email their invite (the link works for 24 hours)
//   pnpm admin:bootstrap <email> --resend   a new link for that super admin, if they lost the email or it expired
//
// It refuses when a super admin already exists, and it never takes over an existing account: if the email already has a
// ReadTraining login, it stops and says to use pnpm admin:grant <email> --super instead. It acts on whichever project the root
// .env points at (pnpm live admin:bootstrap … for the live site).
import { activityLog, adminUsers, eq, sql } from '@readtraining/db'

import { InviteError, INVITE_HOURS, makeInviteLink, sendInviteEmail } from '../lib/adminInvite.mjs'
import { db } from '../lib/db.mjs'
import { emailConfigured } from '../lib/email.mjs'
import { siteUrl, supabase } from '../lib/supabase.mjs'

function stop(message: string): never {
  console.error(message)
  process.exit(1)
}

async function link(email: string) {
  try {
    return await makeInviteLink(email)
  } catch (e) {
    stop(`The invite couldn’t be made: ${e instanceof InviteError ? e.message : String(e)}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const email = args.find((a) => !a.startsWith('--'))?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) stop('Give the super admin’s email, for example: pnpm admin:bootstrap owner@example.com')
  if (!emailConfigured()) stop('Email isn’t set up in .env (SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM), so the invite can’t be sent.')

  // the super admin, whatever their state (there is at most one)
  const [owner] = await db.execute<{ user_id: string; email: string; pending: boolean }>(sql`
    select a.user_id, u.email, (a.invited_at is not null and a.accepted_at is null) pending
    from public.admin_users a join auth.users u on u.id = a.user_id where a.is_super and a.active`)

  if (args.includes('--resend')) {
    if (!owner || owner.email.toLowerCase() !== email) stop(`${email} isn’t the super admin waiting for an invite.`)
    if (!owner.pending) stop(`${email} has already set their password. They sign in at ${siteUrl}/admin/login (or use Forgot your password).`)
    const made = await link(email)
    await db.update(adminUsers).set({ invitedAt: new Date() }).where(eq(adminUsers.userId, owner.user_id))
    await db.insert(activityLog).values({ actorUserId: null, actorIdentity: 'system', action: 'admin.invite_resent', targetType: 'account', targetId: owner.user_id, metadata: { via: 'admin:bootstrap' } })
    if (!(await sendInviteEmail(db, email, made.link, 'ReadTraining', 'super'))) stop('The invite email couldn’t be sent. Check the email settings in .env and try again.')
    console.log(`A new invite was sent to ${email}. The link works for ${INVITE_HOURS} hours; the old one no longer does.`)
    return
  }

  if (owner) stop(`There is already a super admin (${owner.email}${owner.pending ? ', invite not accepted yet: use --resend for a new link' : ''}). This command only makes the first one.`)
  const [existing] = await db.execute<{ id: string }>(sql`select id from auth.users where lower(email) = ${email} and deleted_at is null`)
  if (existing) stop(`${email} already has a ReadTraining login. To make that login the super admin, use: pnpm admin:grant ${email} --super`)

  const made = await link(email)
  // a Full admin who is the super admin, staff-only; access starts when they accept
  const values = { preset: 'full' as const, active: true, isSuper: true, adminOnly: true, invitedAt: new Date(), acceptedAt: null }
  await db.insert(adminUsers).values({ userId: made.userId, ...values }).onConflictDoUpdate({ target: adminUsers.userId, set: values })
  if (!(await sendInviteEmail(db, email, made.link, 'ReadTraining', 'super'))) {
    // nothing is kept, so the command can simply be run again
    await supabase?.auth.admin.deleteUser(made.userId)
    stop('The invite email couldn’t be sent, so nothing was kept. Check the email settings in .env and run this again.')
  }
  await db.insert(activityLog).values({ actorUserId: null, actorIdentity: 'system', action: 'admin.invited', targetType: 'account', targetId: made.userId, metadata: { preset: 'full', super: true, via: 'admin:bootstrap' } })
  console.log(`Invite sent to ${email} (${siteUrl}). They open the link within ${INVITE_HOURS} hours, set their name and password, and become the super admin.`)
}

main()
  .catch((e) => stop(e instanceof Error ? e.message : String(e)))
  .finally(() => process.exit(process.exitCode ?? 0))
