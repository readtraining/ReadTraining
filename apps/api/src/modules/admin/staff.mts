import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { eq, organisations, sql } from '@readtraining/db'

import { openStaffAccess } from '../../lib/actor.mjs'
import { endStaffAccess, startStaffAccess } from '../../lib/staffAccess.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// Editing a provider's work from the admin as ReadTraining staff (components/admin/StaffEdit.jsx): start editing a provider (the
// first edit opens it, no form), see which one is open, finish. While it is open the admin can change, through the provider's
// own API, what their switches allow (packages/permissions `staff`, lib/actor.mts, lib/staffAccess.mts).
export const staffRouter = createTRPCRouter({
  start: adminProcedure('admin.providers.staff')
    .input(z.object({ organisationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => startStaffAccess(ctx, input.organisationId, 'Edited from the admin')),

  // the provider being edited, by its address: only what the edit pages need (its private record is admin.providers.get)
  provider: adminProcedure('admin.providers.staff')
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const [o] = await ctx.db.select({ id: organisations.id, name: organisations.name, slug: organisations.slug, status: organisations.status, type: organisations.type })
        .from(organisations).where(eq(organisations.slug, input.slug))
      if (!o || o.type !== 'provider') throw new TRPCError({ code: 'NOT_FOUND' })
      return { id: o.id, name: o.name, slug: o.slug, status: o.status }
    }),

  // the provider the admin is editing, if any
  // with how many changes it has saved: opening a provider's pages to look changes nothing, so the editing bar (and the provider's
  // summary and history) come only once something is saved
  current: adminProcedure('admin.panel.open').query(async ({ ctx }) => {
    const open = await openStaffAccess(ctx.db, ctx.user.id)
    if (!open) return null
    const [n] = await ctx.db.execute<{ changes: number }>(sql`
      select count(*)::int changes from public.activity_log where metadata->>'staff' = ${open.id} and action <> 'access.denied'`)
    return { organisationId: open.organisationId, startedAt: open.startedAt, changes: n?.changes ?? 0 }
  }),

  // any admin can end their own session (even after losing the switch); the provider's owner is then emailed what changed
  end: adminProcedure('admin.panel.open').mutation(async ({ ctx }) => endStaffAccess(ctx)),
})
