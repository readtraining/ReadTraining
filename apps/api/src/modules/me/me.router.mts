import { TRPCError } from '@trpc/server'

import { eq, inArray, organisations, profiles } from '@readtraining/db'
import { adminPermissions, identitiesOf } from '@readtraining/permissions'

import { createTRPCRouter, protectedProcedure } from '../../trpc/trpc.mjs'

export const meRouter = createTRPCRouter({
  // The signed-in person: profile, the identities they can switch between, and their admin switches (if any).
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, ctx.user.id) })
    if (!profile) throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' })
    const ids = ctx.actor.memberships.map((m) => m.organisationId)
    const orgs = ids.length
      ? await ctx.db.select({ id: organisations.id, name: organisations.name, slug: organisations.slug }).from(organisations).where(inArray(organisations.id, ids))
      : []
    const byId = new Map(orgs.map((o) => [o.id, o]))
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUrl: profile.avatarUrl,
      },
      identities: identitiesOf(ctx.actor).map((i) => ('organisationId' in i ? { ...i, name: byId.get(i.organisationId)?.name ?? '', slug: byId.get(i.organisationId)?.slug ?? '' } : i)),
      admin: ctx.actor.admin ? { preset: ctx.actor.admin.preset, permissions: adminPermissions(ctx.actor.admin), twoStep: ctx.user.aal === 'aal2' } : null,
    }
  }),
})
