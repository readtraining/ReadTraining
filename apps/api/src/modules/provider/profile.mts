import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { eq, organisations } from '@readtraining/db'

import { logActivity } from '../../lib/activity.mjs'
import { IMAGE_TYPES, MEDIA_PATH, mediaExists, mediaUploadUrl, mediaUrl, removeMedia } from '../../lib/media.mjs'
import { createTRPCRouter, orgProcedure } from '../../trpc/trpc.mjs'

// A provider's public profile (headline, about, town, social links, logo) and the terms learners accept when booking with them.
// Both show on the provider's public page and course pages; they change straight away.

const optional = (max: number, what: string) => z.string().trim().max(max, `Keep the ${what} to ${max} characters or fewer.`).nullable()
const social = (host: RegExp, example: string) =>
  z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === '' || host.test(v), `Use a full link, like ${example}.`)
    .optional()

const log = (tx: Parameters<typeof logActivity>[0], ctx: { user: { id: string }; ip: string | null }, organisationId: string, action: string, metadata: Record<string, unknown> = {}) =>
  logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId, action, targetType: 'organisation', targetId: organisationId, metadata, ip: ctx.ip })

export const providerProfileRouter = createTRPCRouter({
  get: orgProcedure('provider.settings.view').query(async ({ ctx, input }) => {
    const [o] = await ctx.db.select().from(organisations).where(eq(organisations.id, input.organisationId))
    if (!o) throw new TRPCError({ code: 'NOT_FOUND' })
    return {
      name: o.name,
      slug: o.slug,
      status: o.status,
      headline: o.headline ?? '',
      bio: o.bio ?? '',
      city: o.city ?? '',
      socials: o.socials,
      logoUrl: mediaUrl(o.logoPath),
      bookingTerms: o.bookingTerms ?? '',
      cancellationPolicy: o.cancellationPolicy ?? '',
    }
  }),

  update: orgProcedure('provider.profile.edit')
    .input(
      z.object({
        headline: optional(120, 'headline'),
        bio: optional(5000, 'about text'),
        city: optional(60, 'town or city'),
        socials: z.object({
          facebook: social(/^https:\/\/(www\.|m\.)?facebook\.com\/\S+$/, 'https://www.facebook.com/yourpage'),
          linkedin: social(/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/\S+$/, 'https://www.linkedin.com/company/yourcompany'),
          youtube: social(/^https:\/\/(www\.)?youtube\.com\/\S+$/, 'https://www.youtube.com/@yourchannel'),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const socials = Object.fromEntries(Object.entries(input.socials).filter(([, v]) => v)) as Record<string, string>
      return ctx.db.transaction(async (tx) => {
        await tx
          .update(organisations)
          .set({ headline: input.headline || null, bio: input.bio || null, city: input.city || null, socials, updatedAt: new Date() })
          .where(eq(organisations.id, input.organisationId))
        await log(tx, ctx, input.organisationId, 'provider.profile_updated')
        return { ok: true }
      })
    }),

  updateTerms: orgProcedure('provider.terms.edit')
    .input(z.object({ bookingTerms: optional(20000, 'booking terms'), cancellationPolicy: optional(10000, 'cancellation policy') }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        await tx
          .update(organisations)
          .set({ bookingTerms: input.bookingTerms || null, cancellationPolicy: input.cancellationPolicy || null, updatedAt: new Date() })
          .where(eq(organisations.id, input.organisationId))
        await log(tx, ctx, input.organisationId, 'provider.terms_updated')
        return { ok: true }
      })
    }),

  // Logo: an upload address, then setLogo with the uploaded file (the old one is deleted), or removeLogo.
  logoUploadUrl: orgProcedure('provider.profile.edit')
    .input(z.object({ contentType: z.enum(Object.keys(IMAGE_TYPES) as [keyof typeof IMAGE_TYPES, ...(keyof typeof IMAGE_TYPES)[]]) }))
    .mutation(async ({ input }) => {
      const up = await mediaUploadUrl(`${input.organisationId}/logo`, input.contentType)
      if (!up) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'We couldn’t prepare the upload. Please try again.' })
      return up
    }),

  setLogo: orgProcedure('provider.profile.edit')
    .input(z.object({ path: z.string().regex(MEDIA_PATH) }))
    .mutation(async ({ ctx, input }) => {
      if (!input.path.startsWith(`${input.organisationId}/logo/`)) throw new TRPCError({ code: 'FORBIDDEN' })
      if (!(await mediaExists(input.path))) throw new TRPCError({ code: 'BAD_REQUEST', message: 'The logo did not upload. Please try again.' })
      const [before] = await ctx.db.select({ logoPath: organisations.logoPath }).from(organisations).where(eq(organisations.id, input.organisationId))
      await ctx.db.transaction(async (tx) => {
        await tx.update(organisations).set({ logoPath: input.path, updatedAt: new Date() }).where(eq(organisations.id, input.organisationId))
        await log(tx, ctx, input.organisationId, 'provider.logo_updated')
      })
      if (before?.logoPath && before.logoPath !== input.path) await removeMedia([before.logoPath])
      return { logoUrl: mediaUrl(input.path) }
    }),

  removeLogo: orgProcedure('provider.profile.edit').mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select({ logoPath: organisations.logoPath }).from(organisations).where(eq(organisations.id, input.organisationId))
    await ctx.db.transaction(async (tx) => {
      await tx.update(organisations).set({ logoPath: null, updatedAt: new Date() }).where(eq(organisations.id, input.organisationId))
      await log(tx, ctx, input.organisationId, 'provider.logo_removed')
    })
    if (before?.logoPath) await removeMedia([before.logoPath])
    return { ok: true }
  }),
})
