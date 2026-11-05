import { TRPCError, initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { ZodError, z } from 'zod'

import { can } from '@readtraining/permissions'
import type { Action, AdminAction, BusinessAction, ProviderAction } from '@readtraining/permissions'

import { logDenied } from '../lib/activity.mjs'
import { friendlyError } from '../lib/dbErrors.mjs'
import { isHuman } from '../lib/humanCheck.mjs'
import { allowed, LIMITS, type LimitName } from '../lib/rateLimit.mjs'
import type { TRPCContext } from './context.mjs'

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  // error answers carry the code's stack (file paths) only on a developer's computer, never on Vercel (live or preview)
  isDev: process.env.NODE_ENV !== 'production' && !process.env.VERCEL,
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

// Every procedure runs through this: a database error (or any other unexpected one) is turned into words a person can act on,
// a duplicate onto its form field, so no table, constraint or query text ever reaches the browser (lib/dbErrors.mts).
const base = t.procedure.use(async ({ next, path }) => {
  const result = await next()
  if (!result.ok) {
    const friendly = friendlyError(result.error, path)
    if (friendly) throw friendly
  }
  return result
})

export const publicProcedure = base

/**
 * Refuses with TOO_MANY_REQUESTS once `key` (the caller's user id, or IP address when signed out) has used up the `name` limit
 * (lib/rateLimit.mts). Call it inside a procedure, before the work: `await limit(ctx, 'uploadHour')`.
 */
export async function limit(ctx: { ip: string | null; user?: { id: string } | null }, name: LimitName, by: 'user' | 'ip' = ctx.user ? 'user' : 'ip') {
  if (!(await allowed(name, by === 'user' ? ctx.user?.id : ctx.ip))) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: LIMITS[name].message })
}

/**
 * A public form that sends to us (contact, quotes, applications, the certificate check… once each is built; their switch is in
 * apps/web/lib/forms.js). The input must carry `humanCheck`, a fresh Cloudflare Turnstile token (the web's sendForm adds it),
 * and each connection may send only a few in a short time. Every public form endpoint MUST use this, never publicProcedure.
 */
export const publicFormProcedure = t.procedure
  .input(z.object({ humanCheck: z.string().min(1).max(2048) }))
  .use(async ({ ctx, input, next }) => {
    await limit(ctx, 'publicForm', 'ip')
    if (!(await isHuman(input.humanCheck, ctx.ip))) throw new TRPCError({ code: 'FORBIDDEN', message: 'We couldn’t confirm you are a person. Please try again.' })
    return next()
  })

/**
 * Signed in with a live session (not signed out, banned or deleted since the token was issued), and `ctx.actor` loaded
 * (memberships and admin switches, read fresh).
 */
export const protectedProcedure = base.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  const { live, actor } = await ctx.loadIdentity()
  if (!live) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.user, actor } })
})

// Refuses with FORBIDDEN and records the attempt in the activity log.
export async function refuse(ctx: { db: TRPCContext['db']; ip: string | null; user: { id: string } }, action: Action, organisationId: string | null, path: string): Promise<never> {
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
