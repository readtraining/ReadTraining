import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { eq, organisations, sql } from '@readtraining/db'
import { can } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import { notifyApprovers, personOf } from '../../lib/notify.mjs'
import { refuseTakenProviderName } from '../../lib/providerName.mjs'
import { MEDIA_PATH, MIN_LOGO, mediaUploadUrl, mediaUrl, removeMedia, storedImageSize } from '../../lib/media.mjs'
import { createTRPCRouter, limit, orgProcedure, refuse } from '../../trpc/trpc.mjs'
import { staffChangeCount } from '../../lib/staffAccess.mjs'

// the roles that read an organisation's private details: our team's status note and messages (the same rule as the database's
// "organisations: read where owner or admin")
export const PRIVATE_ROLES: string[] = ['owner', 'admin']

// A provider's public profile (headline, about, town, social links, logo) and the terms learners accept when booking with them.
// Both show on the provider's public page and course pages; they change straight away, as does the provider's name (the owner or
// an admin of the provider; once approved, the admins who approve are emailed, since a new name could mislead learners). All of it
// is the provider's own: ReadTraining staff read it, never change it.

const optional = (max: number, what: string) => z.string().trim().max(max, `Keep the ${what} to ${max} characters or fewer.`).nullable()
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
  // ReadTraining staff changed something in the provider's work from the admin, with their reason (visits that changed nothing
  // are left out, below)
  'admin.staff_access_started': 'staff',
}
// a page on one site: https, the site itself or any of its own addresses (www., m., business., uk.) and a page after it; the
// form checks the same (settingsForm.jsx isUrlOn with `page`), so a link the form takes is never refused here
const onSite = (v: string, host: string) => {
  try {
    const u = new URL(v)
    return u.protocol === 'https:' && !u.username && !u.password && (u.hostname === host || u.hostname.endsWith(`.${host}`)) && u.pathname.length > 1
  } catch {
    return false
  }
}
const social = (host: string, example: string) =>
  z
    .string()
    .trim()
    .max(200, 'Keep the link to 200 characters or fewer.')
    .refine((v) => v === '' || onSite(v, host), `Use a full link, like ${example}.`)
    .optional()

// a notice address: one email address, required (the database checks the same shape, organisations_notice_emails)
const noticeEmail = z.string().trim().toLowerCase().min(1, 'Enter an email address.').max(254).refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Enter an email address, like bookings@yourcompany.co.uk.')

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
  // Every member can read where it stands (the status bar on every page points here); our team's note and messages are for the
  // owner and admins only (`private`), so a tutor or an assistant sees the status without them.
  review: orgProcedure('provider.workspace.open').query(async ({ ctx, input }) => {
    // ReadTraining staff editing from the admin aren't the provider's owner or admin: the admin's own pages show what they may see
    const member = ctx.actor.memberships.find((m) => m.organisationId === input.organisationId)
    const mayRead = !member?.staff && PRIVATE_ROLES.includes(member?.role ?? '')
    const [o] = await ctx.db.select({ name: organisations.name, status: organisations.status, statusNote: organisations.statusNote, statusChangedAt: organisations.statusChangedAt, createdAt: organisations.createdAt }).from(organisations).where(eq(organisations.id, input.organisationId))
    if (!o) throw new TRPCError({ code: 'NOT_FOUND' })
    const logged = await ctx.db.execute<{ action: string; at: string; target_id: string | null; metadata: Record<string, unknown> | null; actor_identity: string; first_name: string | null; last_name: string | null }>(sql`
      select l.action, l.at, l.target_id, l.metadata, l.actor_identity, p.first_name, p.last_name
      from public.activity_log l left join public.profiles p on p.id = l.actor_user_id
      where l.organisation_id = ${input.organisationId}::uuid and l.action in ${Object.keys(REVIEW_EVENTS)}
      order by l.at desc limit 50`)
    // a staff visit that only looked, or undid what it did, isn't one: shown once it has changed something and kept it
    const counts = await Promise.all(logged.map((r) => (r.action === 'admin.staff_access_started' && r.target_id ? staffChangeCount(ctx.db, r.target_id) : 1)))
    const rows = logged.filter((_, i) => counts[i] > 0)
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
    return {
      name: o.name,
      status: o.status,
      statusNote: mayRead ? o.statusNote : null,
      private: !mayRead,
      statusChangedAt: o.statusChangedAt ? new Date(o.statusChangedAt).toISOString() : null,
      appliedAt: new Date(o.createdAt).toISOString(),
      events: rows.map((r) => {
        const m = r.metadata ?? {}
        const fromTeam = r.actor_identity === 'admin'
        return {
          kind: REVIEW_EVENTS[r.action],
          at: new Date(r.at).toISOString(),
          by: fromTeam ? null : `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || null,
          fromTeam,
          message: fromTeam && !mayRead ? null : text(m.message) ?? text(m.reply),
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
          facebook: social('facebook.com', 'https://www.facebook.com/yourpage'),
          linkedin: social('linkedin.com', 'https://www.linkedin.com/company/yourcompany'),
          youtube: social('youtube.com', 'https://www.youtube.com/@yourchannel'),
        }),
      }),
    )
    .mutation(async ({ ctx, input, path }) => {
      const socials = Object.fromEntries(Object.entries(input.socials).filter(([, v]) => v)) as Record<string, string>
      const [o] = await ctx.db.select({ name: organisations.name, slug: organisations.slug, status: organisations.status }).from(organisations).where(eq(organisations.id, input.organisationId))
      if (!o) throw new TRPCError({ code: 'NOT_FOUND' })
      const rename = input.name !== undefined && input.name !== o.name
      if (rename && !can(ctx.actor, 'provider.profile.rename', { organisationId: input.organisationId })) await refuse(ctx, 'provider.profile.rename', input.organisationId, path)
      const saved = await ctx.db.transaction(async (tx) => {
        if (rename) await refuseTakenProviderName(tx, input.name!, input.organisationId)
        await tx
          .update(organisations)
          .set({ ...(rename ? { name: input.name } : {}), headline: input.headline || null, bio: input.bio || null, city: input.city || null, socials, updatedAt: new Date() })
          .where(eq(organisations.id, input.organisationId))
        // the address (slug) stays as it is, so links to the profile keep working
        if (rename) await log(tx, ctx, input.organisationId, 'provider.renamed', { from: o.name, to: input.name })
        await log(tx, ctx, input.organisationId, 'provider.profile_updated')
        return { ok: true, renamed: rename }
      })
      // an approved provider's new name: the admins who approve are told, after the save and never holding it up
      if (rename && o.status === 'active') {
        try {
          const who = await personOf(ctx.db, ctx.user.id)
          const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date())
          await notifyApprovers(ctx.db, 'admin-provider-renamed', { from: o.name, to: input.name!, slug: o.slug, renamedBy: who?.label ?? 'Someone on their team', date }, { organisationId: input.organisationId, targetType: 'organisation', targetId: input.organisationId, action: 'email.approvers_told' }, ctx.user.id)
        } catch (error) {
          console.error('email admin-provider-renamed: could not tell the admins', error instanceof Error ? error.message : error)
        }
      }
      return saved
    }),

  // Each text is saved on its own: only the one sent changes (two quick saves never undo each other). The cancellation policy
  // can be changed but not emptied: learners see it before they pay.
  updateTerms: orgProcedure('provider.terms.edit')
    .input(
      z.object({
        bookingTerms: optional(20000, 'booking terms').optional(),
        cancellationPolicy: z.string().trim().min(1, 'Enter your cancellation and refund policy.').max(10000, 'Keep the cancellation and refund policy to 10000 characters or fewer.').optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const set: Partial<typeof organisations.$inferInsert> = { updatedAt: new Date() }
      if (input.bookingTerms !== undefined) set.bookingTerms = input.bookingTerms || null
      if (input.cancellationPolicy !== undefined) set.cancellationPolicy = input.cancellationPolicy
      return ctx.db.transaction(async (tx) => {
        await tx.update(organisations).set(set).where(eq(organisations.id, input.organisationId))
        await log(tx, ctx, input.organisationId, 'provider.terms_updated')
        return { ok: true }
      })
    }),

  // VAT (Settings › VAT): owner, admins and the accounts role. Registered with a UK number (GB then 9 digits; spaces dropped,
  // letters made capitals), or not registered, which clears the number. The database checks the same (organisations_vat).
  vat: orgProcedure('provider.vat.view').query(async ({ ctx, input }) => {
    const [o] = await ctx.db.select({ registered: organisations.vatRegistered, number: organisations.vatNumber }).from(organisations).where(eq(organisations.id, input.organisationId))
    if (!o) throw new TRPCError({ code: 'NOT_FOUND' })
    return { registered: o.registered, number: o.number ?? '' }
  }),

  saveVat: orgProcedure('provider.vat.edit')
    .input(
      z
        .object({ registered: z.boolean(), number: z.string().max(40).optional() })
        .transform((v) => ({ registered: v.registered, number: v.registered ? (v.number ?? '').replace(/\s+/g, '').toUpperCase() : null }))
        .superRefine((v, c) => {
          if (v.registered && !/^GB\d{9}$/.test(v.number ?? '')) c.addIssue({ code: 'custom', path: ['number'], message: 'Enter your VAT number: GB then 9 numbers, like GB 123 4567 89.' })
        }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        await tx.update(organisations).set({ vatRegistered: input.registered, vatNumber: input.number, updatedAt: new Date() }).where(eq(organisations.id, input.organisationId))
        await log(tx, ctx, input.organisationId, 'provider.vat_updated', { registered: input.registered })
        return { registered: input.registered, number: input.number ?? '' }
      })
    }),

  // Where the provider's notices go (Settings › Emails): order, refund and dispute addresses, all three required (one not set
  // yet, on an account that hasn't saved them, means the account owner's email). Owner, admins and the accounts role. Saved now for the booking and payment
  // notices that come later.
  emails: orgProcedure('provider.emails.view').query(async ({ ctx, input }) => {
    const [o] = await ctx.db.select({ order: organisations.orderEmail, refund: organisations.refundEmail, dispute: organisations.disputeEmail }).from(organisations).where(eq(organisations.id, input.organisationId))
    if (!o) throw new TRPCError({ code: 'NOT_FOUND' })
    return { order: o.order ?? '', refund: o.refund ?? '', dispute: o.dispute ?? '' }
  }),

  saveEmails: orgProcedure('provider.emails.edit')
    .input(z.object({ order: noticeEmail, refund: noticeEmail, dispute: noticeEmail }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        await tx.update(organisations).set({ orderEmail: input.order, refundEmail: input.refund, disputeEmail: input.dispute, updatedAt: new Date() }).where(eq(organisations.id, input.organisationId))
        await log(tx, ctx, input.organisationId, 'provider.notice_emails_updated')
        return { order: input.order, refund: input.refund, dispute: input.dispute }
      })
    }),

  // Logo: an upload address, then setLogo with the uploaded file (the old one is deleted), or removeLogo.
  logoUploadUrl: orgProcedure('provider.profile.edit')
    // a logo is a JPG, PNG or WebP (apps/web/lib/images.js): not a GIF
    .input(z.object({ contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']) }))
    .mutation(async ({ ctx, input }) => {
      await limit(ctx, 'uploadHour')
      await limit(ctx, 'uploadDay')
      const up = await mediaUploadUrl(`${input.organisationId}/logo`, input.contentType)
      if (!up) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'We couldn’t prepare the upload. Please try again.' })
      return up
    }),

  setLogo: orgProcedure('provider.profile.edit')
    .input(z.object({ path: z.string().regex(MEDIA_PATH) }))
    .mutation(async ({ ctx, input }) => {
      if (!input.path.startsWith(`${input.organisationId}/logo/`)) throw new TRPCError({ code: 'FORBIDDEN' })
      // the stored file itself must be a picture of at least 200 × 200 (whatever the browser said); otherwise it is deleted again
      const size = await storedImageSize(input.path)
      if (size === undefined) throw new TRPCError({ code: 'BAD_REQUEST', message: 'The logo did not upload. Please try again.' })
      if (!size || size.width < MIN_LOGO.width || size.height < MIN_LOGO.height) {
        await removeMedia([input.path])
        throw new TRPCError({ code: 'BAD_REQUEST', message: size ? `This logo is ${size.width} × ${size.height} pixels. Choose one at least ${MIN_LOGO.width} × ${MIN_LOGO.height} pixels.` : 'We couldn’t read that logo. Choose a PNG, JPG or WebP picture.' })
      }
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
