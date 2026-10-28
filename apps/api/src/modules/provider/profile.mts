import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { eq, organisations, sql } from '@readtraining/db'
import { can } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import { IMAGE_TYPES, MEDIA_PATH, mediaExists, mediaUploadUrl, mediaUrl, removeMedia } from '../../lib/media.mjs'
import { createTRPCRouter, orgProcedure, refuse } from '../../trpc/trpc.mjs'

// A provider's public profile (headline, about, town, social links, logo) and the terms learners accept when booking with them.
// Both show on the provider's public page and course pages; they change straight away. The provider's name can change only
// while its application is being reviewed (it is what our team checks); after approval a change goes through us.

const optional = (max: number, what: string) => z.string().trim().max(max, `Keep the ${what} to ${max} characters or fewer.`).nullable()
const UNDER_REVIEW = ['pending', 'changes_requested']
const providerName = z
  .string()
  .trim()
  .min(2, 'Enter your company or instructor name.')
  .max(100, 'Your company or instructor name must be 100 characters or fewer.')
  .refine((v) => /[\p{L}\p{N}]/u.test(v), 'Enter your company or instructor name.')

// The steps of a provider's application, from the activity log, as the provider sees them (our team is never named)
const REVIEW_EVENTS: Record<string, string> = {
  'provider.created': 'applied',
  'provider.reapplied': 'reapplied',
  'provider.renamed': 'renamed',
  'provider.resubmitted': 'resubmitted',
  'admin.provider_changes_requested': 'changes',
  'admin.provider_approved': 'approved',
  'admin.provider_rejected': 'rejected',
  'admin.provider_suspended': 'suspended',
  'admin.provider_reinstated': 'reinstated',
}
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

  // The provider's application: where it stands, and its steps newest first (what our team asked, what the provider replied).
  // Every member can read it: the status bar on every page points here.
  review: orgProcedure('provider.workspace.open').query(async ({ ctx, input }) => {
    const [o] = await ctx.db.select({ name: organisations.name, status: organisations.status, statusNote: organisations.statusNote, statusChangedAt: organisations.statusChangedAt, createdAt: organisations.createdAt }).from(organisations).where(eq(organisations.id, input.organisationId))
    if (!o) throw new TRPCError({ code: 'NOT_FOUND' })
    const rows = await ctx.db.execute<{ action: string; at: string; metadata: Record<string, unknown> | null; actor_identity: string; first_name: string | null; last_name: string | null }>(sql`
      select l.action, l.at, l.metadata, l.actor_identity, p.first_name, p.last_name
      from public.activity_log l left join public.profiles p on p.id = l.actor_user_id
      where l.organisation_id = ${input.organisationId}::uuid and l.action in ${Object.keys(REVIEW_EVENTS)}
      order by l.at desc limit 50`)
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
    return {
      name: o.name,
      status: o.status,
      statusNote: o.statusNote,
      statusChangedAt: o.statusChangedAt ? new Date(o.statusChangedAt).toISOString() : null,
      appliedAt: new Date(o.createdAt).toISOString(),
      canRename: UNDER_REVIEW.includes(o.status) && can(ctx.actor, 'provider.profile.rename', { organisationId: input.organisationId }),
      events: rows.map((r) => {
        const m = r.metadata ?? {}
        const fromTeam = r.actor_identity === 'admin'
        return {
          kind: REVIEW_EVENTS[r.action],
          at: new Date(r.at).toISOString(),
          by: fromTeam ? null : `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || null,
          fromTeam,
          message: text(m.message) ?? text(m.reply),
          from: text(m.from),
          to: text(m.to),
        }
      }),
    }
  }),

  update: orgProcedure('provider.profile.edit')
    .input(
      z.object({
        name: providerName.optional(),
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
    .mutation(async ({ ctx, input, path }) => {
      const socials = Object.fromEntries(Object.entries(input.socials).filter(([, v]) => v)) as Record<string, string>
      const [o] = await ctx.db.select({ name: organisations.name, status: organisations.status }).from(organisations).where(eq(organisations.id, input.organisationId))
      if (!o) throw new TRPCError({ code: 'NOT_FOUND' })
      const rename = input.name !== undefined && input.name !== o.name
      if (rename) {
        if (!can(ctx.actor, 'provider.profile.rename', { organisationId: input.organisationId })) await refuse(ctx, 'provider.profile.rename', input.organisationId, path)
        if (!UNDER_REVIEW.includes(o.status)) throw new TRPCError({ code: 'CONFLICT', message: 'Your account is approved, so its name can only be changed by our team. Contact us to change it.' })
      }
      return ctx.db.transaction(async (tx) => {
        await tx
          .update(organisations)
          .set({ ...(rename ? { name: input.name } : {}), headline: input.headline || null, bio: input.bio || null, city: input.city || null, socials, updatedAt: new Date() })
          .where(eq(organisations.id, input.organisationId))
        // the address (slug) stays as it is, so links to the profile keep working
        if (rename) await log(tx, ctx, input.organisationId, 'provider.renamed', { from: o.name, to: input.name })
        await log(tx, ctx, input.organisationId, 'provider.profile_updated')
        return { ok: true, renamed: rename }
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
