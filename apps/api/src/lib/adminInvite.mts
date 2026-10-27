import { renderEmail, wordsFor } from '../emails/templates.mjs'
import type { db as Db } from './db.mjs'
import { sendEmail } from './email.mjs'
import { siteUrl, supabase } from './supabase.mjs'

// Admin invites (Admin › Team, and pnpm admin:bootstrap for the first super admin). There is no admin sign-up: someone without
// a ReadTraining account gets one made here, with no password, and an email with a single-use link. The link signs them in at
// /auth/confirm and opens /admin/welcome, where they set their name and password; only then does their admin access start
// (lib/actor.mts ignores an invite that hasn't been accepted). The email goes through our own email system (Brevo), with
// words an admin can edit, not through Supabase's templates.

export const WELCOME_PATH = '/admin/welcome'
// How long an invite link works. It must match the Supabase project's "Email OTP Expiration" (Authentication > Providers >
// Email), which is what actually ends the link: 86400 seconds = 24 hours.
export const INVITE_HOURS = 24
export const ROLE_LABEL = { full: 'Full', support: 'Support', finance: 'Finance', custom: 'Custom' } as const

export class InviteError extends Error {}

/**
 * A new single-use sign-in link for the person, as a link to our own site. A new email gets an account (no password) through
 * Supabase's admin invite. Someone invited before who opened the link but didn't finish has a confirmed account, so Supabase
 * won't invite them again: they get a magic link instead, which works the same way here. Server only (service role key).
 */
export async function makeInviteLink(email: string): Promise<{ userId: string; link: string }> {
  if (!supabase) throw new InviteError('SUPABASE_SERVICE_ROLE_KEY is not set, so invites can’t be made.')
  const redirectTo = `${siteUrl}/auth/confirm?next=${encodeURIComponent(WELCOME_PATH)}`
  let res = await supabase.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo, data: { admin_invite: true } } })
  if (res.error && /already|registered|exists/i.test(res.error.message)) {
    res = await supabase.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } })
  }
  if (res.error || !res.data.user) throw new InviteError(res.error?.message ?? 'The invite link couldn’t be made.')
  const { hashed_token: tokenHash, verification_type: type } = res.data.properties
  const link = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&next=${encodeURIComponent(WELCOME_PATH)}`
  return { userId: res.data.user.id, link }
}

// The invite email (single-use link). Returns false when it couldn't be sent, so the screen can offer Resend.
export async function sendInviteEmail(db: typeof Db, to: string, link: string, invitedBy: string, role: string) {
  const vars = { firstName: '', invitedBy, role, hours: String(INVITE_HOURS), link }
  return sendEmail(renderEmail('admin-invite', await wordsFor(db, 'admin-invite'), vars, siteUrl, to))
}

// The notice for someone who already has an account and was just added to the team (they sign in as usual).
export async function sendAddedEmail(db: typeof Db, to: string, firstName: string, invitedBy: string, role: string) {
  return sendEmail(renderEmail('admin-added', await wordsFor(db, 'admin-added'), { firstName, invitedBy, role }, siteUrl, to))
}

// Has an invite sent at this time run out?
export const inviteExpired = (invitedAt: Date | string) => Date.now() - new Date(invitedAt).getTime() > INVITE_HOURS * 3600_000
