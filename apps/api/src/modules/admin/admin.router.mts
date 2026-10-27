import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { adminUsers, eq, profiles, sql } from '@readtraining/db'
import { adminPermissions, can, needsTwoStep } from '@readtraining/permissions'

import { logActivity, logDenied } from '../../lib/activity.mjs'
import { inviteExpired, ROLE_LABEL } from '../../lib/adminInvite.mjs'
import { newPassword, personName } from '../../lib/rules.mjs'
import { supabase } from '../../lib/supabase.mjs'
import { createTRPCRouter, protectedProcedure } from '../../trpc/trpc.mjs'
import { activityRouter } from './activity.mjs'
import { catalogueAdminRouter } from './catalogue.mjs'
import { commissionRouter } from './commission.mjs'
import { couponsRouter } from './coupons.mjs'
import { adminCoursesRouter } from './courses.mjs'
import { emailsRouter } from './emails.mjs'
import { disputesRouter, ordersRouter, refundsRouter } from './money.mjs'
import { feesRouter, ledgerRouter, payoutsRouter } from './payouts.mjs'
import { platformRouter } from './platform.mjs'
import { providersRouter } from './providers.mjs'
import { studentsRouter } from './students.mjs'
import { teamRouter } from './team.mjs'

// The admin sign-in (/admin/login) and the check behind every /admin page. Admins are people with an active admin_users row
// whose invite (if they were invited) has been accepted: there is no sign-up; the first super admin comes from
// pnpm admin:bootstrap and everyone else from an invite in Admin › Team. Full admins, and any admin who has set up an authenticator,
// must finish two-step sign-in (Supabase MFA, aal2) before the panel opens.

export const adminRouter = createTRPCRouter({
  team: teamRouter,
  activity: activityRouter,
  students: studentsRouter,
  providers: providersRouter,
  courses: adminCoursesRouter,
  commission: commissionRouter,
  catalogue: catalogueAdminRouter,
  emails: emailsRouter,
  coupons: couponsRouter,
  platform: platformRouter,
  orders: ordersRouter,
  refunds: refundsRouter,
  disputes: disputesRouter,
  payouts: payoutsRouter,
  ledger: ledgerRouter,
  fees: feesRouter,

  // The login page, after the password step (`attempt`) or when it opens with a session already there. Says what comes next:
  // set up an authenticator, enter its code, or open the panel. Not an admin is an expected answer here, not an error:
  // `denied` (the page signs them out), logged when it was a sign-in attempt.
  check: protectedProcedure.input(z.object({ attempt: z.boolean() })).mutation(async ({ ctx, input }) => {
    const admin = ctx.actor.admin
    if (!admin) {
      if (input.attempt)
        await logDenied(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'student', attempted: 'admin.panel.open', targetType: 'page', targetId: '/admin/login', ip: ctx.ip })
      return { step: 'denied' as const }
    }
    if (ctx.actor.aal === 'aal2' || !needsTwoStep(admin)) return { step: 'ready' as const }
    return { step: admin.twoStep ? ('challenge' as const) : ('enrol' as const) }
  }),

  // Every /admin page (proxy.js and the panel layout): the admin, or FORBIDDEN. An admin who still has to finish two-step
  // sign-in is sent back to the login page without a log entry; anyone else is logged with the page they asked for.
  open: protectedProcedure.input(z.object({ path: z.string().max(300) })).query(async ({ ctx, input }) => {
    const admin = ctx.actor.admin
    if (!can(ctx.actor, 'admin.panel.open')) {
      if (!admin)
        await logDenied(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'student', attempted: 'admin.panel.open', targetType: 'page', targetId: input.path, ip: ctx.ip })
      throw new TRPCError({ code: 'FORBIDDEN', message: admin ? 'two_step' : undefined })
    }
    const [me] = await ctx.db.execute<{ first_name: string; last_name: string; email: string }>(sql`
      select p.first_name, p.last_name, u.email
      from auth.users u left join public.profiles p on p.id = u.id
      where u.id = ${ctx.user.id}::uuid`)
    return {
      id: ctx.user.id,
      name: `${me?.first_name ?? ''} ${me?.last_name ?? ''}`.trim() || (me?.email ?? ''),
      email: me?.email ?? '',
      preset: admin!.preset,
      permissions: adminPermissions(admin),
      twoStep: admin!.twoStep === true,
      isSuper: admin!.isSuper === true,
    }
  }),

  // The "Set your password" page (/admin/welcome), opened from an invite link: is there an invite waiting for this login?
  invite: protectedProcedure.query(async ({ ctx }) => {
    const [r] = await ctx.db.execute<{ email: string; first_name: string | null; last_name: string | null; preset: keyof typeof ROLE_LABEL; is_super: boolean; invited_at: string }>(sql`
      select u.email, p.first_name, p.last_name, a.preset, a.is_super, a.invited_at
      from public.admin_users a join auth.users u on u.id = a.user_id left join public.profiles p on p.id = a.user_id
      where a.user_id = ${ctx.user.id}::uuid and a.active and a.invited_at is not null and a.accepted_at is null`)
    if (!r) return { pending: false as const }
    return { pending: true as const, email: r.email, firstName: r.first_name ?? '', lastName: r.last_name ?? '', role: r.is_super ? 'super admin' : ROLE_LABEL[r.preset], expired: inviteExpired(r.invited_at) }
  }),

  // Accept the invite: their name and password are saved and their admin access starts. The password is set with the service
  // role (the account has none yet), which ends this sign-in, so the page then signs in with the new password.
  acceptInvite: protectedProcedure
    .input(z.object({ firstName: personName('first name'), lastName: personName('last name'), password: newPassword }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.execute<{ email: string; invited_at: string }>(sql`
        select u.email, a.invited_at from public.admin_users a join auth.users u on u.id = a.user_id
        where a.user_id = ${ctx.user.id}::uuid and a.active and a.invited_at is not null and a.accepted_at is null`)
      if (!row) throw new TRPCError({ code: 'CONFLICT', message: 'There’s no invite waiting for this account. It may have been cancelled or already used.' })
      if (inviteExpired(row.invited_at)) throw new TRPCError({ code: 'FORBIDDEN', message: 'This invite has expired. Ask the person who invited you to send a new one.' })
      if (!supabase) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Your password couldn’t be saved just now. Please try again in a moment.' })
      const { error } = await supabase.auth.admin.updateUserById(ctx.user.id, { password: input.password })
      if (error) {
        const weak = /weak|password/i.test(error.message)
        const message = weak ? 'Choose a stronger password: at least 8 characters, with letters and numbers.' : 'Your password couldn’t be saved just now. Please try again in a moment.'
        throw new TRPCError({ code: weak ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR', message, cause: weak ? Object.assign(new Error(message), { field: 'password' }) : undefined })
      }
      await ctx.db.transaction(async (tx) => {
        await tx.update(profiles).set({ firstName: input.firstName, lastName: input.lastName }).where(eq(profiles.id, ctx.user.id))
        await tx.update(adminUsers).set({ acceptedAt: new Date() }).where(eq(adminUsers.userId, ctx.user.id))
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.invite_accepted', targetType: 'account', targetId: ctx.user.id, metadata: {}, ip: ctx.ip })
      })
      return { email: row.email }
    }),

  // Sign-in finished (password, and the code when needed): one admin.login entry, noting a newly set-up authenticator.
  signedIn: protectedProcedure.input(z.object({ enrolled: z.boolean() })).mutation(async ({ ctx, input }) => {
    if (!can(ctx.actor, 'admin.panel.open')) throw new TRPCError({ code: 'FORBIDDEN' })
    await logActivity(ctx.db, {
      actorUserId: ctx.user.id,
      actorIdentity: 'admin',
      action: 'admin.login',
      targetType: 'account',
      targetId: ctx.user.id,
      metadata: { aal: ctx.actor.aal, ...(input.enrolled ? { authenticatorAdded: true } : {}) },
      ip: ctx.ip,
    })
    return { ok: true }
  }),
})
