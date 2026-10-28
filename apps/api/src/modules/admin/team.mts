import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { adminUsers, and, eq, sql } from '@readtraining/db'
import { ADMIN_PERMISSIONS, ADMIN_PRESETS, adminPermissions, grantableAdminPermissions } from '@readtraining/permissions'
import type { Actor, AdminPermission } from '@readtraining/permissions'

import { logActivity, logDenied } from '../../lib/activity.mjs'
import { InviteError, inviteExpired, makeInviteLink, ROLE_LABEL, sendAddedEmail, sendInviteEmail } from '../../lib/adminInvite.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { notify, personOf } from '../../lib/notify.mjs'
import { supabase } from '../../lib/supabase.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// Admin Users & Roles (Part B, B1): the admin team itself. One role with switches and presets (Full, Support, Finance,
// Custom), as agreed in Part A. Every change needs the "admins" switch, is logged, and two safeguards keep the team from
// locking itself out: nobody changes or removes their own access, and at least one active Full admin always remains.
// The super admin is the platform's owner: a Full admin whom nobody else can change, remove or reset, and, once there is one,
// the only person who can add, change or remove Full admins. They can hand the role to another Full admin (the first one is
// made with pnpm admin:bootstrap). Once there is a super admin, nobody else gives more than they have: only switches they hold
// themselves (never "admins"), a refund limit no higher than their own, and no changing, resetting or removing an admin who
// holds a switch they couldn't give (otherwise Custom with every switch would be Full by another name).
//
// Adding an admin is an invite (lib/adminInvite.mts): someone without an account gets a staff-only login and an email to set
// their password; their access starts when they do. Someone who already has an account is added at once and told by email.

const manage = adminProcedure('admin.admins.manage')
const preset = z.enum(['full', 'support', 'finance', 'custom'])
const permissions = z.array(z.enum(ADMIN_PERMISSIONS)).max(ADMIN_PERMISSIONS.length)
// refund limit in pounds on the screen, pence in the database; Full admins have no limit
const refundLimit = z.number().int().min(0).max(100000)

type Preset = z.infer<typeof preset>
type Row = {
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  preset: Preset
  permissions: string[]
  refund_limit_pence: number
  is_super: boolean
  two_step: boolean
  last_sign_in_at: string | null
  created_at: string
  invited_at: string | null
  accepted_at: string | null
  admin_only: boolean
}

// an invite that hasn't been accepted yet (no password set, no access)
const PENDING = sql`(a.invited_at is not null and a.accepted_at is null)`

// who the super admin is (their account id), or null while there is none
async function superAdmin(db: typeof Db) {
  const [r] = await db.select({ userId: adminUsers.userId }).from(adminUsers).where(and(eq(adminUsers.active, true), eq(adminUsers.isSuper, true)))
  return r?.userId ?? null
}
// a problem with the email typed into "Invite an admin": the form shows it under that field and moves the cursor there
const emailError = (code: 'NOT_FOUND' | 'CONFLICT', message: string) => new TRPCError({ code, message, cause: Object.assign(new Error(message), { field: 'email' }) })
const SUPER_ONLY = 'Only the super admin can add, change or remove a Full admin.'
const SUPER_PROTECTED = 'The super admin can’t be changed or removed. They can hand the role to another Full admin first.'
const INVITE_FAILED = 'The invite couldn’t be made just now. Please try again in a moment.'

// Full admins who can use the panel now (accepted invites only), not counting one person
async function fullAdminsLeft(db: typeof Db, without: string) {
  const [r] = await db.execute<{ n: number }>(sql`select count(*)::int n from public.admin_users a where a.active and a.preset = 'full' and not ${PENDING} and a.user_id <> ${without}::uuid`)
  return r?.n ?? 0
}

// the name an email signs off with: the admin who sent the invite
async function nameOf(db: typeof Db, userId: string) {
  const [me] = await db.execute<{ first_name: string | null; last_name: string | null; email: string }>(sql`
    select p.first_name, p.last_name, u.email from auth.users u left join public.profiles p on p.id = u.id where u.id = ${userId}::uuid`)
  return `${me?.first_name ?? ''} ${me?.last_name ?? ''}`.trim() || me?.email || 'The ReadTraining team'
}

// one admin row with what the screen needs; NOT_FOUND when they aren't on the team
async function member(db: typeof Db, userId: string) {
  const [r] = await db.execute<{ email: string; preset: Preset; permissions: string[]; refund_limit_pence: number; pending: boolean; admin_only: boolean }>(sql`
    select u.email, a.preset, a.permissions, a.refund_limit_pence, ${PENDING} pending, a.admin_only
    from public.admin_users a join auth.users u on u.id = a.user_id
    where a.user_id = ${userId}::uuid and a.active`)
  if (!r) throw new TRPCError({ code: 'NOT_FOUND', message: 'This person is not on the admin team.' })
  return r
}

// ---- nobody gives more than they have (once there is a super admin, who can give anything) ----
type TeamCtx = { db: typeof Db; ip: string | null; user: { id: string }; actor: Actor }
const switchesOf = (preset: Preset, permissions: string[]) => adminPermissions({ active: true, preset, permissions, refundLimitPence: 0 })
const limitedBy = (ctx: TeamCtx, owner: string | null) => Boolean(owner) && !ctx.actor.admin?.isSuper
const notMine = (ctx: TeamCtx, switches: AdminPermission[]) => switches.filter((p) => !grantableAdminPermissions(ctx.actor.admin ?? null).includes(p))

async function refuseTeam(ctx: TeamCtx, targetId: string | null, message: string, field: string | null, metadata: Record<string, unknown>): Promise<never> {
  await logDenied(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'admin', attempted: 'admin.admins.manage', targetType: 'account', targetId, metadata, ip: ctx.ip })
  throw new TRPCError({ code: 'FORBIDDEN', message, cause: field ? Object.assign(new Error(message), { field }) : undefined })
}
// the access being given: only switches the giver could give, and a refund limit no higher than their own (Full: no limit)
async function checkGiving(ctx: TeamCtx, owner: string | null, targetId: string | null, preset: Preset, permissions: string[], refundLimitPence: number) {
  if (!limitedBy(ctx, owner)) return
  const switches = switchesOf(preset, permissions)
  const missing = notMine(ctx, switches)
  if (missing.length) {
    const others = missing.filter((p) => p !== 'admins')
    const message = [others.length ? `You can only give access you have yourself. Not yours to give: ${others.join(', ')}.` : '', missing.includes('admins') ? 'Only the super admin can give the "admins" switch.' : '']
    await refuseTeam(ctx, targetId, message.filter(Boolean).join(' '), preset === 'custom' ? 'permissions' : null, { preset, missing })
  }
  const me = ctx.actor.admin
  if (me && me.preset !== 'full' && switches.some((p) => p === 'refunds' || p === 'wallet') && refundLimitPence > me.refundLimitPence)
    await refuseTeam(ctx, targetId, `You can't give a refund limit above your own (£${me.refundLimitPence / 100}).`, 'refundLimit', { refundLimitPence })
}
// changing, resetting or removing someone: not when they hold a switch the person acting couldn't give
async function checkTouching(ctx: TeamCtx, owner: string | null, targetId: string, before: { preset: Preset; permissions: string[] }) {
  if (!limitedBy(ctx, owner)) return
  const missing = notMine(ctx, switchesOf(before.preset, before.permissions))
  if (missing.length) await refuseTeam(ctx, targetId, 'Only the super admin can change or remove an admin who has access you don’t have.', null, { missing })
}

export const teamRouter = createTRPCRouter({
  list: manage.query(async ({ ctx }) => {
    const rows = await ctx.db.execute<Row>(sql`
      select a.user_id, u.email, p.first_name, p.last_name, a.preset, a.permissions, a.refund_limit_pence, a.is_super,
             exists (select 1 from auth.mfa_factors f where f.user_id = a.user_id and f.status = 'verified') as two_step,
             u.last_sign_in_at, a.created_at, a.invited_at, a.accepted_at, a.admin_only
      from public.admin_users a join auth.users u on u.id = a.user_id left join public.profiles p on p.id = a.user_id
      where a.active
      order by a.created_at`)
    const hasSuper = rows.some((r) => r.is_super)
    const me = ctx.actor.admin ?? null
    const limited = hasSuper && !me?.isSuper
    return {
      me: ctx.user.id,
      meSuper: me?.isSuper === true,
      hasSuper,
      // what this admin may give others, and their own refund limit in pounds (null: no limit); the screen offers only these and
      // the server checks again
      grantable: limited ? grantableAdminPermissions(me) : [...ADMIN_PERMISSIONS],
      myRefundLimit: limited && me && me.preset !== 'full' ? Math.round(me.refundLimitPence / 100) : null,
      switches: [...ADMIN_PERMISSIONS],
      presets: ADMIN_PRESETS,
      admins: rows.map((r) => {
        const pending = Boolean(r.invited_at && !r.accepted_at)
        return {
          userId: r.user_id,
          email: r.email,
          name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.email,
          preset: r.preset,
          permissions: adminPermissions({ active: true, preset: r.preset, permissions: r.permissions, refundLimitPence: r.refund_limit_pence }),
          refundLimit: Math.round(r.refund_limit_pence / 100),
          isSuper: r.is_super,
          twoStep: r.two_step,
          lastSignInAt: pending ? null : r.last_sign_in_at,
          createdAt: r.created_at,
          // an invite waiting for them to set their password, and whether its link has run out
          invite: pending ? { sentAt: r.invited_at, expired: inviteExpired(r.invited_at!) } : null,
        }
      }),
    }
  }),

  // Invite an admin. No account with this email: one is made (staff-only, no password) and the invite email goes out; access
  // starts when they set their password. An existing account: added now, and told by email. `emailed` false means the email
  // couldn't be sent (the screen offers Resend).
  add: manage
    .input(z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.'), preset, permissions: permissions.optional(), refundLimit: refundLimit.optional() }))
    .mutation(async ({ ctx, input }) => {
      const owner = await superAdmin(ctx.db)
      if (input.preset === 'full' && !ctx.actor.admin?.isSuper && owner) throw new TRPCError({ code: 'FORBIDDEN', message: SUPER_ONLY })
      const values = { preset: input.preset, permissions: input.preset === 'custom' ? (input.permissions ?? []) : [], refundLimitPence: (input.refundLimit ?? 100) * 100, active: true }
      await checkGiving(ctx, owner, null, values.preset, values.permissions, values.refundLimitPence)
      const [user] = await ctx.db.execute<{ id: string; first_name: string | null }>(sql`
        select u.id, p.first_name from auth.users u left join public.profiles p on p.id = u.id
        where lower(u.email) = ${input.email} and u.deleted_at is null`)
      const invitedBy = await nameOf(ctx.db, ctx.user.id)
      const role = ROLE_LABEL[input.preset]

      if (user) {
        const [existing] = await ctx.db.select({ active: adminUsers.active, invitedAt: adminUsers.invitedAt, acceptedAt: adminUsers.acceptedAt }).from(adminUsers).where(eq(adminUsers.userId, user.id))
        if (existing?.active) {
          throw emailError('CONFLICT', existing.invitedAt && !existing.acceptedAt ? 'This person has already been invited. Use Resend on their row to send a new link.' : 'This person is already on the admin team.')
        }
        // an existing account: their own sign-in, nothing to set up; a past invite that was never accepted counts as accepted now
        await ctx.db.transaction(async (tx) => {
          const set = { ...values, acceptedAt: existing?.invitedAt ? new Date() : null }
          await tx.insert(adminUsers).values({ userId: user.id, createdBy: ctx.user.id, ...set }).onConflictDoUpdate({ target: adminUsers.userId, set })
          await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.granted', targetType: 'account', targetId: user.id, metadata: { preset: input.preset }, ip: ctx.ip })
        })
        const emailed = await sendAddedEmail(ctx.db, input.email, user.first_name ?? '', invitedBy, role)
        return { userId: user.id, invited: false, emailed }
      }

      let made: { userId: string; link: string }
      try {
        made = await makeInviteLink(input.email)
      } catch (e) {
        console.error('admin invite:', e instanceof Error ? e.message : e)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e instanceof InviteError && /SERVICE_ROLE/.test(e.message) ? e.message : INVITE_FAILED })
      }
      await ctx.db.transaction(async (tx) => {
        const set = { ...values, invitedAt: new Date(), acceptedAt: null, adminOnly: true }
        await tx.insert(adminUsers).values({ userId: made.userId, createdBy: ctx.user.id, ...set }).onConflictDoUpdate({ target: adminUsers.userId, set })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.invited', targetType: 'account', targetId: made.userId, metadata: { preset: input.preset }, ip: ctx.ip })
      })
      const emailed = await sendInviteEmail(ctx.db, input.email, made.link, invitedBy, role)
      return { userId: made.userId, invited: true, emailed }
    }),

  // A new invite link for someone who hasn't set their password yet (the old link stops working).
  resend: manage.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const m = await member(ctx.db, input.userId)
    if (!m.pending) throw new TRPCError({ code: 'CONFLICT', message: 'This person has already accepted their invite.' })
    const owner = await superAdmin(ctx.db)
    if (m.preset === 'full' && !ctx.actor.admin?.isSuper && owner) throw new TRPCError({ code: 'FORBIDDEN', message: SUPER_ONLY })
    await checkTouching(ctx, owner, input.userId, m)
    let link: string
    try {
      link = (await makeInviteLink(m.email)).link
    } catch (e) {
      console.error('admin invite:', e instanceof Error ? e.message : e)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: INVITE_FAILED })
    }
    await ctx.db.update(adminUsers).set({ invitedAt: new Date() }).where(eq(adminUsers.userId, input.userId))
    await logActivity(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.invite_resent', targetType: 'account', targetId: input.userId, metadata: {}, ip: ctx.ip })
    const emailed = await sendInviteEmail(ctx.db, m.email, link, await nameOf(ctx.db, ctx.user.id), ROLE_LABEL[m.preset])
    return { emailed }
  }),

  update: manage
    .input(z.object({ userId: z.string().uuid(), preset, permissions: permissions.optional(), refundLimit }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can’t change your own access. Ask another Full admin.' })
      const before = await member(ctx.db, input.userId)
      const owner = await superAdmin(ctx.db)
      if (owner === input.userId) throw new TRPCError({ code: 'FORBIDDEN', message: SUPER_PROTECTED })
      if (owner && !ctx.actor.admin?.isSuper && (before.preset === 'full' || input.preset === 'full')) throw new TRPCError({ code: 'FORBIDDEN', message: SUPER_ONLY })
      await checkTouching(ctx, owner, input.userId, before)
      await checkGiving(ctx, owner, input.userId, input.preset, input.preset === 'custom' ? (input.permissions ?? []) : [], input.refundLimit * 100)
      if (!before.pending && before.preset === 'full' && input.preset !== 'full' && (await fullAdminsLeft(ctx.db, input.userId)) === 0)
        throw new TRPCError({ code: 'CONFLICT', message: 'There must always be at least one Full admin.' })
      const nextPermissions = input.preset === 'custom' ? (input.permissions ?? []) : []
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(adminUsers)
          .set({ preset: input.preset, permissions: nextPermissions, refundLimitPence: input.refundLimit * 100 })
          .where(eq(adminUsers.userId, input.userId))
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.updated', targetType: 'account', targetId: input.userId, metadata: { from: before.preset, to: input.preset, refundLimit: input.refundLimit }, ip: ctx.ip })
      })
      // they're told when their access really changed (not for an invite they haven't accepted: that has its own email)
      const same = (a: string[], b: string[]) => [...a].sort().join() === [...b].sort().join()
      const changed = before.preset !== input.preset || !same(before.permissions, nextPermissions) || before.refund_limit_pence !== input.refundLimit * 100
      if (changed && !before.pending) {
        await notify(ctx.db, 'admin-role-changed', await personOf(ctx.db, input.userId), { changedBy: await nameOf(ctx.db, ctx.user.id), role: ROLE_LABEL[input.preset] }, { targetType: 'account', targetId: input.userId, action: 'email.admin_access_sent' })
      }
      return { ok: true }
    }),

  // Remove someone's admin access, or cancel an invite they haven't accepted. A cancelled invite made a staff-only login, so that
  // login is deleted too (nothing else uses it); an existing account just loses the admin role.
  revoke: manage.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    if (input.userId === ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can’t remove your own access. Ask another Full admin.' })
    const before = await member(ctx.db, input.userId)
    const owner = await superAdmin(ctx.db)
    if (owner === input.userId) throw new TRPCError({ code: 'FORBIDDEN', message: SUPER_PROTECTED })
    if (owner && !ctx.actor.admin?.isSuper && before.preset === 'full') throw new TRPCError({ code: 'FORBIDDEN', message: SUPER_ONLY })
    await checkTouching(ctx, owner, input.userId, before)
    if (!before.pending && before.preset === 'full' && (await fullAdminsLeft(ctx.db, input.userId)) === 0)
      throw new TRPCError({ code: 'CONFLICT', message: 'There must always be at least one Full admin.' })
    const action = before.pending ? 'admin.invite_cancelled' : 'admin.revoked'
    await ctx.db.transaction(async (tx) => {
      await tx.update(adminUsers).set({ active: false }).where(eq(adminUsers.userId, input.userId))
      await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action, targetType: 'account', targetId: input.userId, metadata: {}, ip: ctx.ip })
    })
    if (before.pending && before.admin_only && supabase) {
      const { error } = await supabase.auth.admin.deleteUser(input.userId)
      if (error) console.error('admin invite: the unused login could not be deleted:', error.message)
    }
    // someone who had access is told it has gone (a cancelled invite never gave any)
    if (!before.pending) {
      await notify(ctx.db, 'admin-access-removed', await personOf(ctx.db, input.userId), { changedBy: await nameOf(ctx.db, ctx.user.id) }, { targetType: 'account', targetId: input.userId, action: 'email.admin_access_sent' })
    }
    return { ok: true }
  }),

  // The super admin hands the role to another active Full admin (a new owner, say). They stay a Full admin themselves.
  handOver: manage.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    if (!ctx.actor.admin?.isSuper) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the super admin can hand the role over.' })
    if (input.userId === ctx.user.id) throw new TRPCError({ code: 'CONFLICT', message: 'You are already the super admin.' })
    const to = await member(ctx.db, input.userId)
    if (to.preset !== 'full') throw new TRPCError({ code: 'CONFLICT', message: 'Hand the role to an admin with Full access.' })
    if (to.pending) throw new TRPCError({ code: 'CONFLICT', message: 'They need to accept their invite first.' })
    await ctx.db.transaction(async (tx) => {
      await tx.update(adminUsers).set({ isSuper: false }).where(eq(adminUsers.userId, ctx.user.id))
      await tx.update(adminUsers).set({ isSuper: true }).where(eq(adminUsers.userId, input.userId))
      await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.super_handed_over', targetType: 'account', targetId: input.userId, metadata: {}, ip: ctx.ip })
    })
    return { ok: true }
  }),

  // A lost phone: remove the person's authenticator; they set up a new one at their next admin sign-in.
  resetTwoStep: manage.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    if (input.userId === ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can’t reset your own two-step sign-in. Ask another Full admin.' })
    const owner = await superAdmin(ctx.db)
    if (owner === input.userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'The super admin’s two-step sign-in can only be reset with pnpm admin:grant <email> --reset-two-step.' })
    await checkTouching(ctx, owner, input.userId, await member(ctx.db, input.userId))
    if (!supabase) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Two-step sign-in can’t be reset right now.' })
    const factors = await supabase.auth.admin.mfa.listFactors({ userId: input.userId })
    if (factors.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Two-step sign-in can’t be reset right now.' })
    for (const f of factors.data.factors) await supabase.auth.admin.mfa.deleteFactor({ id: f.id, userId: input.userId })
    await logActivity(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.two_step_reset', targetType: 'account', targetId: input.userId, metadata: { removed: factors.data.factors.length }, ip: ctx.ip })
    return { removed: factors.data.factors.length }
  }),
})
