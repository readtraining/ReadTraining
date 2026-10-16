import { TRPCError, initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { ZodError, z } from 'zod'

import { can } from '@readtraining/permissions'
import type { Action, AdminAction, BusinessAction, ProviderAction } from '@readtraining/permissions'

import { logDenied } from '../lib/activity.mjs'
import { isSessionLive, loadActor } from '../lib/actor.mjs'
import type { TRPCContext } from './context.mjs'

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        // a check that failed on one form field (for example a wrong current password), so the form shows it there
        field: error.cause && 'field' in error.cause && typeof error.cause.field === 'string' ? error.cause.field : null,
      },
    }
  },
})

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory

export const publicProcedure = t.procedure

/**
 * Signed in with a live session (not signed out, banned or deleted since the token was issued), and `ctx.actor` loaded
 * (memberships and admin switches, read fresh).
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  const [live, actor] = await Promise.all([isSessionLive(ctx.db, ctx.user), loadActor(ctx.db, ctx.user)])
  if (!live) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.user, actor } })
})

// Refuses with FORBIDDEN and records the attempt in the activity log.
async function refuse(ctx: { db: TRPCContext['db']; ip: string | null; user: { id: string } }, action: Action, organisationId: string | null, path: string): Promise<never> {
  await logDenied(ctx.db, {
    actorUserId: ctx.user.id,
    actorIdentity: action.startsWith('admin.') ? 'admin' : action.startsWith('provider.') ? 'provider' : action.startsWith('business.') ? 'business' : 'student',
    organisationId,
    attempted: action,
    targetType: 'procedure',
    targetId: path,
    ip: ctx.ip,
  })
  throw new TRPCError({ code: 'FORBIDDEN' })
}

/**
 * A provider or business action on one organisation. The input must carry `organisationId`; the check uses the caller's
 * membership in that organisation. Rules that need more (own cohorts, team changes, amounts) call `can()` again in the
 * procedure with the full target.
 */
export const orgProcedure = (action: ProviderAction | BusinessAction) =>
  protectedProcedure.input(z.object({ organisationId: z.string().uuid() })).use(async ({ ctx, input, path, next }) => {
    const { organisationId } = input as { organisationId: string }
    if (!can(ctx.actor, action, { organisationId })) await refuse(ctx, action, organisationId, path)
    return next()
  })

/** A platform admin action: an active admin row, the switch for it, and two-step sign-in for Full admins. */
export const adminProcedure = (action: AdminAction) =>
  protectedProcedure.use(async ({ ctx, path, next }) => {
    if (!can(ctx.actor, action)) await refuse(ctx, action, null, path)
    return next()
  })
