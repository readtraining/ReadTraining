import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { and, cohorts, courses, eq, gte, organisationMembers, organisations, profiles, sql } from '@readtraining/db'
import { can, PROVIDER_ROLES } from '@readtraining/permissions'
import type { ProviderAction, ProviderRole } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import { InviteError, INVITE_HOURS, inviteExpired, makeInviteLink } from '../../lib/adminInvite.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { emailOutbox, sendEmail } from '../../lib/email.mjs'
import { newPassword, personName } from '../../lib/rules.mjs'
import { siteUrl, supabase } from '../../lib/supabase.mjs'
import { renderEmail, wordsFor } from '../../emails/templates.mjs'
import { createTRPCRouter, limit, orgProcedure, protectedProcedure, refuse } from '../../trpc/trpc.mjs'
import { ukToday as today } from './courses.mjs'

// A provider's team (Team, for the owner and admins): invite someone by email with a role, see everyone with their role and
// whether they have joined, change a role, send an invite again, remove someone. The owner can't be removed, changed or given
// away here, nobody gives the owner role and nobody changes their own (packages/permissions `provider.team.manage`). An invite
// makes a ReadTraining account with no password when the email has none, and emails a single-use link (24 hours) that signs
// them in at /provider/join, where they set their name and password if they have none and join; until then their row is
// `invited` and gives no access. Someone removed is taken off as tutor of the provider's upcoming dates.

export const JOIN_PATH = '/provider/join'
const role = z.enum(PROVIDER_ROLES.filter((r) => r !== 'owner') as [Exclude<ProviderRole, 'owner'>, ...Exclude<ProviderRole, 'owner'>[]])
const ROLE_NAMES: Record<ProviderRole, string> = {
  owner: 'Account owner',
  admin: 'Admin',
  tutor: 'Tutor',
  course_editor: 'Course editor',
  support: 'Customer support',
  sales: 'Sales executive',
  accounts: 'Accounts analyst',
  marketing: 'Marketing executive',
  assistant: 'Account assistant',
}
const NOT_FOUND = 'This person isn’t on your team any more. Reload the page.'

type Ctx = { db: typeof Db; ip: string | null; user: { id: string }; actor: Parameters<typeof can>[0] }

const nameOf = async (db: typeof Db, userId: string) => {
  const [p] = await db.execute<{ name: string }>(sql`select trim(concat_ws(' ', p.first_name, p.last_name)) name from public.profiles p where p.id = ${userId}::uuid`)
  return p?.name || 'Someone'
}

// one team row (with the person's email), or NOT_FOUND
async function memberOf(db: typeof Db, organisationId: string, userId: string) {
  const [m] = await db.execute<{ role: ProviderRole; status: 'invited' | 'active'; email: string; invited_at: string | null }>(sql`
    select m.role, m.status, u.email, m.invited_at from public.organisation_members m join auth.users u on u.id = m.user_id
    where m.organisation_id = ${organisationId}::uuid and m.user_id = ${userId}::uuid`)
  if (!m) throw new TRPCError({ code: 'NOT_FOUND', message: NOT_FOUND })
  return m
}

// the shared table again with the person being changed (their role, the new one, themselves): refused and logged otherwise
async function mayChange(ctx: Ctx, path: string, organisationId: string, target: { memberRole?: ProviderRole; newRole?: ProviderRole; memberUserId?: string }, message: string) {
  const action: ProviderAction = 'provider.team.manage'
  if (!can(ctx.actor, action, { organisationId, ...target })) {
    await refuse(ctx, action, organisationId, path).catch(() => {
      throw new TRPCError({ code: 'FORBIDDEN', message })
    })
  }
}

// The invite email: who invited them, to which provider, as what, and the link
async function sendTeamInvite(db: typeof Db, to: string, link: string, invitedBy: string, provider: string, roleName: string) {
  const vars = { firstName: '', invitedBy, provider, role: roleName, hours: String(INVITE_HOURS), link }
  return sendEmail(renderEmail('provider-team-invite', await wordsFor(db, 'provider-team-invite'), vars, siteUrl, to))
}

async function inviteLink(email: string) {
  try {
    return await makeInviteLink(email, JOIN_PATH)
  } catch (e) {
    console.error('team invite:', e instanceof Error ? e.message : e)
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e instanceof InviteError && /SERVICE_ROLE/.test(e.message) ? e.message : 'The invite couldn’t be made just now. Please try again in a moment.' })
  }
}

export const providerTeamRouter = createTRPCRouter({
  // Everyone on the team: the owner first, then by name; with their role, whether they've joined (an invite's link may have run
  // out) and how many upcoming dates they tutor (said before someone is removed)
  list: orgProcedure('provider.team.view').query(async ({ ctx, input }) => {
    const rows = await ctx.db.execute<{ user_id: string; email: string; first_name: string | null; last_name: string | null; role: ProviderRole; status: 'invited' | 'active'; invited_at: string | null; tutoring: number }>(sql`
      select m.user_id, u.email, p.first_name, p.last_name, m.role, m.status, m.invited_at,
             (select count(*)::int from public.cohorts k join public.courses c on c.id = k.course_id
              where c.organisation_id = m.organisation_id and k.tutor_user_id = m.user_id and k.cancelled_at is null and k.ends_on >= ${today()}) tutoring
      from public.organisation_members m join auth.users u on u.id = m.user_id left join public.profiles p on p.id = m.user_id
      where m.organisation_id = ${input.organisationId}::uuid
      order by m.role = 'owner' desc, coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), u.email)`)
    return {
      me: ctx.user.id,
      members: rows.map((r) => ({
        userId: r.user_id,
        email: r.email,
        name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
        role: r.role,
        status: r.status,
        invitedAt: r.invited_at ? new Date(r.invited_at).toISOString() : null,
        expired: r.status === 'invited' && Boolean(r.invited_at) && inviteExpired(r.invited_at!),
        tutoring: r.tutoring,
      })),
    }
  }),

  // Invite someone by email with a role
  invite: orgProcedure('provider.team.manage')
    .input(z.object({ email: z.string().trim().toLowerCase().email('Enter an email address in the correct format, like name@example.com.'), role }))
    .mutation(async ({ ctx, input, path }) => {
      await limit(ctx, 'teamInvite')
      await mayChange(ctx, path, input.organisationId, { newRole: input.role }, 'You can’t give that role.')
      const [org] = await ctx.db.select({ name: organisations.name }).from(organisations).where(eq(organisations.id, input.organisationId))
      const [already] = await ctx.db.execute<{ status: string }>(sql`
        select m.status from public.organisation_members m join auth.users u on u.id = m.user_id
        where m.organisation_id = ${input.organisationId}::uuid and lower(u.email) = ${input.email}`)
      if (already) {
        const message = already.status === 'invited' ? 'This person is already invited. Use Resend invite on their row.' : 'This person is already on your team.'
        throw new TRPCError({ code: 'CONFLICT', message, cause: Object.assign(new Error(message), { field: 'email' }) })
      }
      const made = await inviteLink(input.email)
      await ctx.db.transaction(async (tx) => {
        await tx
          .insert(organisationMembers)
          .values({ organisationId: input.organisationId, userId: made.userId, role: input.role, status: 'invited', invitedBy: ctx.user.id, invitedAt: new Date() })
          .onConflictDoNothing()
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId: input.organisationId, action: 'provider.member_invited', targetType: 'account', targetId: made.userId, metadata: { role: input.role }, ip: ctx.ip })
      })
      const emailed = await sendTeamInvite(ctx.db, input.email, made.link, await nameOf(ctx.db, ctx.user.id), org?.name ?? '', ROLE_NAMES[input.role])
      return { emailed, outbox: emailOutbox() }
    }),

  // A new invite link for someone who hasn't joined yet (the old one stops working)
  resend: orgProcedure('provider.team.manage')
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await limit(ctx, 'teamInvite')
      const m = await memberOf(ctx.db, input.organisationId, input.userId)
      if (m.status !== 'invited') throw new TRPCError({ code: 'CONFLICT', message: 'This person has already joined.' })
      const [org] = await ctx.db.select({ name: organisations.name }).from(organisations).where(eq(organisations.id, input.organisationId))
      const made = await inviteLink(m.email)
      await ctx.db.transaction(async (tx) => {
        await tx.update(organisationMembers).set({ invitedAt: new Date(), invitedBy: ctx.user.id }).where(and(eq(organisationMembers.organisationId, input.organisationId), eq(organisationMembers.userId, input.userId)))
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId: input.organisationId, action: 'provider.member_invite_resent', targetType: 'account', targetId: input.userId, metadata: {}, ip: ctx.ip })
      })
      const emailed = await sendTeamInvite(ctx.db, m.email, made.link, await nameOf(ctx.db, ctx.user.id), org?.name ?? '', ROLE_NAMES[m.role])
      return { emailed, outbox: emailOutbox() }
    }),

  // Change someone's role (never the owner's, never your own, never to owner)
  setRole: orgProcedure('provider.team.manage')
    .input(z.object({ userId: z.string().uuid(), role }))
    .mutation(async ({ ctx, input, path }) => {
      const m = await memberOf(ctx.db, input.organisationId, input.userId)
      await mayChange(ctx, path, input.organisationId, { memberRole: m.role, newRole: input.role, memberUserId: input.userId }, m.role === 'owner' ? 'The account owner’s role can’t be changed.' : 'You can’t change your own role.')
      if (m.role === input.role) return { ok: true }
      await ctx.db.transaction(async (tx) => {
        const [row] = await tx.update(organisationMembers).set({ role: input.role }).where(and(eq(organisationMembers.organisationId, input.organisationId), eq(organisationMembers.userId, input.userId), sql`${organisationMembers.role} <> 'owner'`)).returning({ userId: organisationMembers.userId })
        if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: NOT_FOUND })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId: input.organisationId, action: 'provider.member_role_changed', targetType: 'account', targetId: input.userId, metadata: { from: m.role, to: input.role }, ip: ctx.ip })
      })
      return { ok: true }
    }),

  // Remove someone, or cancel their invite. They lose access at once and stop tutoring the provider's upcoming dates.
  remove: orgProcedure('provider.team.manage')
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input, path }) => {
      const m = await memberOf(ctx.db, input.organisationId, input.userId)
      await mayChange(ctx, path, input.organisationId, { memberRole: m.role, memberUserId: input.userId }, m.role === 'owner' ? 'The account owner can’t be removed.' : 'You can’t remove yourself.')
      await ctx.db.transaction(async (tx) => {
        const [row] = await tx.delete(organisationMembers).where(and(eq(organisationMembers.organisationId, input.organisationId), eq(organisationMembers.userId, input.userId), sql`${organisationMembers.role} <> 'owner'`)).returning({ userId: organisationMembers.userId })
        if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: NOT_FOUND })
        await tx
          .update(cohorts)
          .set({ tutorUserId: null, updatedAt: new Date() })
          .where(and(eq(cohorts.tutorUserId, input.userId), gte(cohorts.endsOn, today()), sql`${cohorts.courseId} in (select ${courses.id} from ${courses} where ${courses.organisationId} = ${input.organisationId}::uuid)`))
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId: input.organisationId, action: m.status === 'invited' ? 'provider.member_invite_cancelled' : 'provider.member_removed', targetType: 'account', targetId: input.userId, metadata: { role: m.role }, ip: ctx.ip })
      })
      return { ok: true }
    }),
})

// The invited person's side (/provider/join, signed in by the invite link): the invites waiting for this login, and joining.
export const teamInviteRouter = createTRPCRouter({
  // their invites, newest first; whether they still need a name and password (an account the invite made has neither)
  mine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute<{ organisation_id: string; name: string; role: ProviderRole; invited_at: string | null; invited_by: string | null }>(sql`
      select m.organisation_id, o.name, m.role, m.invited_at, trim(concat_ws(' ', ip.first_name, ip.last_name)) invited_by
      from public.organisation_members m join public.organisations o on o.id = m.organisation_id
      left join public.profiles ip on ip.id = m.invited_by
      where m.user_id = ${ctx.user.id}::uuid and m.status = 'invited' and o.status in ('active', 'suspended')
      order by m.invited_at desc nulls last`)
    const [me] = await ctx.db.execute<{ email: string; has_password: boolean; first_name: string | null; last_name: string | null }>(sql`
      select u.email, coalesce(u.encrypted_password, '') <> '' has_password, p.first_name, p.last_name
      from auth.users u left join public.profiles p on p.id = u.id where u.id = ${ctx.user.id}::uuid`)
    return {
      email: me?.email ?? '',
      needsPassword: !me?.has_password,
      firstName: me?.first_name ?? '',
      lastName: me?.last_name ?? '',
      invites: rows.map((r) => ({ organisationId: r.organisation_id, provider: r.name, role: ROLE_NAMES[r.role], invitedBy: r.invited_by || null, expired: Boolean(r.invited_at) && inviteExpired(r.invited_at!) })),
    }
  }),

  // Join: a new account first saves its name and password (set with the service role, which ends this sign-in, so the page then
  // signs in with the new password), then the row becomes active
  join: protectedProcedure
    .input(z.object({ organisationId: z.string().uuid(), firstName: personName('first name').optional(), lastName: personName('last name').optional(), password: newPassword.optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.execute<{ invited_at: string | null; has_password: boolean; email: string }>(sql`
        select m.invited_at, coalesce(u.encrypted_password, '') <> '' has_password, u.email
        from public.organisation_members m join public.organisations o on o.id = m.organisation_id join auth.users u on u.id = m.user_id
        where m.organisation_id = ${input.organisationId}::uuid and m.user_id = ${ctx.user.id}::uuid and m.status = 'invited' and o.status in ('active', 'suspended')`)
      if (!row) throw new TRPCError({ code: 'CONFLICT', message: 'There’s no invite waiting for this account. It may have been cancelled or already used.' })
      if (row.invited_at && inviteExpired(row.invited_at)) throw new TRPCError({ code: 'FORBIDDEN', message: 'This invite has expired. Ask the person who invited you to send a new one.' })
      const setUp = !row.has_password
      if (setUp) {
        const missing = !input.firstName ? 'firstName' : !input.lastName ? 'lastName' : !input.password ? 'password' : null
        if (missing) {
          const message = missing === 'password' ? 'Choose a password.' : missing === 'firstName' ? 'Enter your first name.' : 'Enter your last name.'
          throw new TRPCError({ code: 'BAD_REQUEST', message, cause: Object.assign(new Error(message), { field: missing }) })
        }
        if (!supabase) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Your password couldn’t be saved just now. Please try again in a moment.' })
        const { error } = await supabase.auth.admin.updateUserById(ctx.user.id, { password: input.password })
        if (error) {
          const weak = /weak|password/i.test(error.message)
          const message = weak ? 'Choose a stronger password: at least 8 characters, with letters and numbers.' : 'Your password couldn’t be saved just now. Please try again in a moment.'
          throw new TRPCError({ code: weak ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR', message, cause: weak ? Object.assign(new Error(message), { field: 'password' }) : undefined })
        }
      }
      await ctx.db.transaction(async (tx) => {
        if (setUp) await tx.update(profiles).set({ firstName: input.firstName!, lastName: input.lastName! }).where(eq(profiles.id, ctx.user.id))
        await tx.update(organisationMembers).set({ status: 'active' }).where(and(eq(organisationMembers.organisationId, input.organisationId), eq(organisationMembers.userId, ctx.user.id), eq(organisationMembers.status, 'invited')))
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId: input.organisationId, action: 'provider.member_joined', targetType: 'account', targetId: ctx.user.id, metadata: {}, ip: ctx.ip })
      })
      return { email: row.email, signInAgain: setUp }
    }),
})
