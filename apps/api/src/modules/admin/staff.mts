import { z } from 'zod'

import { openStaffAccess } from '../../lib/actor.mjs'
import { endStaffAccess, startStaffAccess } from '../../lib/staffAccess.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// Working in a provider's workspace as ReadTraining staff (Admin › Providers › a provider › Open workspace): open it with a
// reason, see which one is open, end it. While it is open the provider workspace (/provider) opens on that provider and the
// admin can change what their switches allow there (packages/permissions `staff`, lib/actor.mts, lib/staffAccess.mts).
export const staffRouter = createTRPCRouter({
  start: adminProcedure('admin.providers.staff')
    .input(z.object({ organisationId: z.string().uuid(), reason: z.string().trim().min(3, 'Say why you are opening this workspace.').max(300, 'Keep the reason to 300 characters or fewer.') }))
    .mutation(async ({ ctx, input }) => startStaffAccess(ctx, input.organisationId, input.reason)),

  // the admin's open session, if any (the workspace's banner reads it through organisations.openWorkspace too)
  current: adminProcedure('admin.panel.open').query(async ({ ctx }) => {
    const open = await openStaffAccess(ctx.db, ctx.user.id)
    return open ? { organisationId: open.organisationId, reason: open.reason, startedAt: open.startedAt } : null
  }),

  // any admin can end their own session (even after losing the switch); the provider's owner is then emailed what changed
  end: adminProcedure('admin.panel.open').mutation(async ({ ctx }) => endStaffAccess(ctx)),
})
