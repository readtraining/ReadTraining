import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { adminUsers, and, eq, sql } from '@readtraining/db'
import { ADMIN_PERMISSIONS, ADMIN_PRESETS, adminPermissions } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { supabase } from '../../lib/supabase.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// Admin Users & Roles (Part B, B1): the admin team itself. One role with switches and presets (Full, Support, Finance,
// Custom), as agreed in Part A. Every change needs the "admins" switch, is logged, and two safeguards keep the team from
// locking itself out: nobody changes or removes their own access, and at least one active Full admin always remains.
// The super admin is the platform's owner: a Full admin whom nobody else can change, remove or reset, and, once there is one,
// the only person who can add, change or remove Full admins. They can hand the role to another Full admin (pnpm admin:grant
// <email> --super sets the first one).

const manage = adminProcedure('admin.admins.manage')
const preset = z.enum(['full', 'support', 'finance', 'custom'])
const permissions = z.array(z.enum(ADMIN_PERMISSIONS)).max(ADMIN_PERMISSIONS.length)
// refund limit in pounds on the screen, pence in the database; Full admins have no limit
const refundLimit = z.number().int().min(0).max(100000)

type Row = { user_id: string; email: string; first_name: string | null; last_name: string | null; preset: 'full' | 'support' | 'finance' | 'custom'; permissions: string[]; refund_limit_pence: number; is_super: boolean; two_step: boolean; last_sign_in_at: string | null; created_at: string }

// who the super admin is (their account id), or null while there is none
async function superAdmin(db: typeof Db) {
  const [r] = await db.select({ userId: adminUsers.userId }).from(adminUsers).where(and(eq(adminUsers.active, true), eq(adminUsers.isSuper, true)))
  return r?.userId ?? null
}
// a problem with the email typed into "Add an admin": the form shows it under that field and moves the cursor there
const emailError = (code: 'NOT_FOUND' | 'CONFLICT', message: string) => new TRPCError({ code, message, cause: Object.assign(new Error(message), { field: 'email' }) })
const SUPER_ONLY = 'Only the super admin can add, change or remove a Full admin.'
const SUPER_PROTECTED = 'The super admin can’t be changed or removed. They can hand the role to another Full admin first.'

async function fullAdminsLeft(db: typeof Db, without: string) {
  const [r] = await db.execute<{ n: number }>(sql`select count(*)::int n from public.admin_users where active and preset = 'full' and user_id <> ${without}::uuid`)
  return r?.n ?? 0
}

export const teamRouter = createTRPCRouter({
  list: manage.query(async ({ ctx }) => {
    const rows = await ctx.db.execute<Row>(sql`
      select a.user_id, u.email, p.first_name, p.last_name, a.preset, a.permissions, a.refund_limit_pence, a.is_super,
             exists (select 1 from auth.mfa_factors f where f.user_id = a.user_id and f.status = 'verified') as two_step,
             u.last_sign_in_at, a.created_at
      from public.admin_users a join auth.users u on u.id = a.user_id left join public.profiles p on p.id = a.user_id
      where a.active
      order by a.created_at`)
    return {
      me: ctx.user.id,
      meSuper: ctx.actor.admin?.isSuper === true,
      hasSuper: rows.some((r) => r.is_super),
      switches: [...ADMIN_PERMISSIONS],
      presets: ADMIN_PRESETS,
      admins: rows.map((r) => ({
        userId: r.user_id,
        email: r.email,
        name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.email,
        preset: r.preset,
        permissions: adminPermissions({ active: true, preset: r.preset, permissions: r.permissions, refundLimitPence: r.refund_limit_pence }),
        refundLimit: Math.round(r.refund_limit_pence / 100),
        isSuper: r.is_super,
        twoStep: r.two_step,
        lastSignInAt: r.last_sign_in_at,
        createdAt: r.created_at,
      })),
    }
  }),

  // An admin is always an existing account: the person signs up on the site first (there is no admin sign-up).
  add: manage
    .input(z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.'), preset, permissions: permissions.optional(), refundLimit: refundLimit.optional() }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.execute<{ id: string }>(sql`select id from auth.users where lower(email) = ${input.email} and deleted_at is null`)
      if (!user) throw emailError('NOT_FOUND', 'No account uses this email. Ask them to sign up on the site first, then add them here.')
      const [existing] = await ctx.db.select({ active: adminUsers.active }).from(adminUsers).where(eq(adminUsers.userId, user.id))
      if (existing?.active) throw emailError('CONFLICT', 'This person is already on the admin team.')
      if (input.preset === 'full' && !ctx.actor.admin?.isSuper && (await superAdmin(ctx.db))) throw new TRPCError({ code: 'FORBIDDEN', message: SUPER_ONLY })
      const values = { preset: input.preset, permissions: input.preset === 'custom' ? (input.permissions ?? []) : [], refundLimitPence: (input.refundLimit ?? 100) * 100, active: true }
      await ctx.db.transaction(async (tx) => {
        await tx.insert(adminUsers).values({ userId: user.id, createdBy: ctx.user.id, ...values }).onConflictDoUpdate({ target: adminUsers.userId, set: values })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.granted', targetType: 'account', targetId: user.id, metadata: { preset: input.preset }, ip: ctx.ip })
      })
      return { userId: user.id }
    }),

  update: manage
    .input(z.object({ userId: z.string().uuid(), preset, permissions: permissions.optional(), refundLimit }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can’t change your own access. Ask another Full admin.' })
      const [before] = await ctx.db.select({ preset: adminUsers.preset, active: adminUsers.active }).from(adminUsers).where(eq(adminUsers.userId, input.userId))
      if (!before?.active) throw new TRPCError({ code: 'NOT_FOUND', message: 'This person is not on the admin team.' })
      const owner = await superAdmin(ctx.db)
      if (owner === input.userId) throw new TRPCError({ code: 'FORBIDDEN', message: SUPER_PROTECTED })
      if (owner && !ctx.actor.admin?.isSuper && (before.preset === 'full' || input.preset === 'full')) throw new TRPCError({ code: 'FORBIDDEN', message: SUPER_ONLY })
      if (before.preset === 'full' && input.preset !== 'full' && (await fullAdminsLeft(ctx.db, input.userId)) === 0)
        throw new TRPCError({ code: 'CONFLICT', message: 'There must always be at least one Full admin.' })
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(adminUsers)
          .set({ preset: input.preset, permissions: input.preset === 'custom' ? (input.permissions ?? []) : [], refundLimitPence: input.refundLimit * 100 })
          .where(eq(adminUsers.userId, input.userId))
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.updated', targetType: 'account', targetId: input.userId, metadata: { from: before.preset, to: input.preset, refundLimit: input.refundLimit }, ip: ctx.ip })
      })
      return { ok: true }
    }),

  revoke: manage.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    if (input.userId === ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can’t remove your own access. Ask another Full admin.' })
    const [before] = await ctx.db.select({ preset: adminUsers.preset }).from(adminUsers).where(and(eq(adminUsers.userId, input.userId), eq(adminUsers.active, true)))
    if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'This person is not on the admin team.' })
    const owner = await superAdmin(ctx.db)
    if (owner === input.userId) throw new TRPCError({ code: 'FORBIDDEN', message: SUPER_PROTECTED })
    if (owner && !ctx.actor.admin?.isSuper && before.preset === 'full') throw new TRPCError({ code: 'FORBIDDEN', message: SUPER_ONLY })
    if (before.preset === 'full' && (await fullAdminsLeft(ctx.db, input.userId)) === 0)
      throw new TRPCError({ code: 'CONFLICT', message: 'There must always be at least one Full admin.' })
    await ctx.db.transaction(async (tx) => {
      await tx.update(adminUsers).set({ active: false }).where(eq(adminUsers.userId, input.userId))
      await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.revoked', targetType: 'account', targetId: input.userId, metadata: {}, ip: ctx.ip })
    })
    return { ok: true }
  }),

  // The super admin hands the role to another active Full admin (a new owner, say). They stay a Full admin themselves.
  handOver: manage.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    if (!ctx.actor.admin?.isSuper) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the super admin can hand the role over.' })
    if (input.userId === ctx.user.id) throw new TRPCError({ code: 'CONFLICT', message: 'You are already the super admin.' })
    const [to] = await ctx.db.select({ preset: adminUsers.preset }).from(adminUsers).where(and(eq(adminUsers.userId, input.userId), eq(adminUsers.active, true)))
    if (to?.preset !== 'full') throw new TRPCError({ code: 'CONFLICT', message: 'Hand the role to an admin with Full access.' })
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
    if ((await superAdmin(ctx.db)) === input.userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'The super admin’s two-step sign-in can only be reset with pnpm admin:grant <email> --reset-two-step.' })
    if (!supabase) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Two-step sign-in can’t be reset right now.' })
    const factors = await supabase.auth.admin.mfa.listFactors({ userId: input.userId })
    if (factors.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Two-step sign-in can’t be reset right now.' })
    for (const f of factors.data.factors) await supabase.auth.admin.mfa.deleteFactor({ id: f.id, userId: input.userId })
    await logActivity(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.two_step_reset', targetType: 'account', targetId: input.userId, metadata: { removed: factors.data.factors.length }, ip: ctx.ip })
    return { removed: factors.data.factors.length }
  }),
})
