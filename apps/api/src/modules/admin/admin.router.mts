import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { sql } from '@readtraining/db'
import { adminPermissions, can, needsTwoStep } from '@readtraining/permissions'

import { logActivity, logDenied } from '../../lib/activity.mjs'
import { createTRPCRouter, protectedProcedure } from '../../trpc/trpc.mjs'
import { activityRouter } from './activity.mjs'
import { catalogueAdminRouter } from './catalogue.mjs'
import { commissionRouter } from './commission.mjs'
import { couponsRouter } from './coupons.mjs'
import { emailsRouter } from './emails.mjs'
import { disputesRouter, ordersRouter, refundsRouter } from './money.mjs'
import { feesRouter, ledgerRouter, payoutsRouter } from './payouts.mjs'
import { platformRouter } from './platform.mjs'
import { providersRouter } from './providers.mjs'
import { studentsRouter } from './students.mjs'
import { teamRouter } from './team.mjs'

// The admin sign-in (/admin/login) and the check behind every /admin page. Admins are people with an active admin_users row
// (added with the admin:grant script; there is no sign-up). Full admins, and any admin who has set up an authenticator,
// must finish two-step sign-in (Supabase MFA, aal2) before the panel opens.

export const adminRouter = createTRPCRouter({
  team: teamRouter,
  activity: activityRouter,
  students: studentsRouter,
  providers: providersRouter,
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
    }
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
