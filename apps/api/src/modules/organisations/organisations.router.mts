import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { and, eq, like, or, organisationMembers, organisations } from '@readtraining/db'
import { can } from '@readtraining/permissions'

import { logActivity, logDenied } from '../../lib/activity.mjs'
import { createTRPCRouter, orgProcedure, protectedProcedure, publicProcedure } from '../../trpc/trpc.mjs'

// One login, several identities (Hurak's model): every account is a student; a provider and a business are organisations the
// person belongs to. These procedures add an identity, open a workspace (the server-side check behind every /provider and
// /business page), log a switch between identities, and read a provider's public profile.

// The provider terms a new provider accepts (the date of the version on /provider-terms; change both together).
export const PROVIDER_TERMS_VERSION = '2026-10-16'

const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '') || 'provider'

const phone = z
  .string()
  .trim()
  .refine((v) => /^\+?[\d\s()-]+$/.test(v) && v.replace(/\D/g, '').length >= 10 && v.replace(/\D/g, '').length <= 15, 'Enter a phone number, like 07700 900 982.')
const orgName = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `Enter your ${label}.`)
    .max(100, `Your ${label} must be 100 characters or fewer.`)
    .refine((v) => /[\p{L}\p{N}]/u.test(v), `Enter your ${label}.`)

export const organisationsRouter = createTRPCRouter({
  // Become a provider (from the student account): company or instructor name, mobile number, the provider terms.
  createProvider: protectedProcedure
    .input(
      z.object({
        name: orgName('company or instructor name'),
        mobile: phone,
        acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Agree to the provider terms to continue.' }) }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.memberships.some((m) => m.type === 'provider' && m.role === 'owner'))
        throw new TRPCError({ code: 'CONFLICT', message: 'You already have a provider account. Use Switch account to open it.' })
      const base = slugify(input.name)
      const taken = await ctx.db
        .select({ slug: organisations.slug })
        .from(organisations)
        .where(or(eq(organisations.slug, base), like(organisations.slug, `${base}-%`)))
      const used = new Set(taken.map((t) => t.slug))
      let slug = base
      for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`
      const org = await ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(organisations)
          .values({ type: 'provider', name: input.name, slug, mobile: input.mobile, status: 'pending', termsAcceptedAt: new Date(), termsVersion: PROVIDER_TERMS_VERSION, createdBy: ctx.user.id })
          .returning({ id: organisations.id, slug: organisations.slug, name: organisations.name })
        await tx.insert(organisationMembers).values({ organisationId: created.id, userId: ctx.user.id, role: 'owner' })
        await logActivity(tx, {
          actorUserId: ctx.user.id,
          actorIdentity: 'student',
          organisationId: created.id,
          action: 'provider.created',
          targetType: 'organisation',
          targetId: created.id,
          metadata: { termsVersion: PROVIDER_TERMS_VERSION },
          ip: ctx.ip,
        })
        return created
      })
      return org
    }),

  // Create a business account (Hurak's "Create a Business Account"): company name, your role, phone. Ready straight away.
  createBusiness: protectedProcedure
    .input(z.object({ companyName: orgName('company name'), jobTitle: z.string().trim().min(2, 'Enter your role, like Operations Manager.').max(80, 'Your role must be 80 characters or fewer.'), phone }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.memberships.some((m) => m.type === 'business' && m.role === 'owner'))
        throw new TRPCError({ code: 'CONFLICT', message: 'You already have a business account. Use Switch account to open it.' })
      const base = slugify(input.companyName)
      const taken = await ctx.db.select({ slug: organisations.slug }).from(organisations).where(or(eq(organisations.slug, base), like(organisations.slug, `${base}-%`)))
      const used = new Set(taken.map((t) => t.slug))
      let slug = base
      for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`
      return ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(organisations)
          .values({ type: 'business', name: input.companyName, slug, mobile: input.phone, status: 'active', createdBy: ctx.user.id })
          .returning({ id: organisations.id, slug: organisations.slug, name: organisations.name })
        await tx.insert(organisationMembers).values({ organisationId: created.id, userId: ctx.user.id, role: 'owner', jobTitle: input.jobTitle })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'student', organisationId: created.id, action: 'business.created', targetType: 'organisation', targetId: created.id, ip: ctx.ip })
        return created
      })
    }),

  // The check behind every /provider and /business page, on every request: which of the person's organisations of that type
  // to open (the one asked for, or their first), and whether the shared permission table lets them in. A refusal is logged
  // with the page that was asked for.
  openWorkspace: protectedProcedure
    .input(z.object({ type: z.enum(['provider', 'business']), organisationId: z.string().uuid().optional(), path: z.string().max(300) }))
    .query(async ({ ctx, input }) => {
      const mine = ctx.actor.memberships.filter((m) => m.type === input.type && m.status === 'active' && m.organisationStatus !== 'rejected')
      const chosen = (input.organisationId && mine.find((m) => m.organisationId === input.organisationId)) || mine[0]
      const action = input.type === 'provider' ? 'provider.workspace.open' : 'business.workspace.open'
      if (!chosen || !can(ctx.actor, action, { organisationId: chosen.organisationId })) {
        await logDenied(ctx.db, {
          actorUserId: ctx.user.id,
          actorIdentity: 'student',
          organisationId: input.organisationId ?? null,
          attempted: action,
          targetType: 'page',
          targetId: input.path,
          ip: ctx.ip,
        })
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      const [org] = await ctx.db
        .select({ id: organisations.id, name: organisations.name, slug: organisations.slug, status: organisations.status, statusNote: organisations.statusNote })
        .from(organisations)
        .where(eq(organisations.id, chosen.organisationId))
      return { ...org, type: input.type, role: chosen.role }
    }),

  // After the ReadTraining team asked for changes: the provider says they're done (with an optional note for the team), and
  // the account goes back to waiting for a decision.
  resubmit: orgProcedure('provider.profile.edit')
    .input(z.object({ organisationId: z.string().uuid(), reply: z.string().trim().max(1000, 'Keep your note to 1,000 characters or fewer.').optional() }))
    .mutation(async ({ ctx, input }) => {
      const reply = input.reply?.trim() || null
      return ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(organisations)
          .set({ status: 'pending', statusNote: null, statusChangedAt: new Date() })
          .where(and(eq(organisations.id, input.organisationId), eq(organisations.type, 'provider'), eq(organisations.status, 'changes_requested')))
          .returning({ id: organisations.id })
        if (!updated) throw new TRPCError({ code: 'CONFLICT', message: 'Your account is not waiting for changes any more. Reload the page.' })
        await logActivity(tx, {
          actorUserId: ctx.user.id,
          actorIdentity: 'provider',
          organisationId: input.organisationId,
          action: 'provider.resubmitted',
          targetType: 'organisation',
          targetId: input.organisationId,
          metadata: reply ? { reply } : {},
          ip: ctx.ip,
        })
        return { status: 'pending' as const }
      })
    }),

  // Switch account: logs which identity the person moved to (the page they land on checks access itself).
  switchIdentity: protectedProcedure
    .input(z.object({ to: z.enum(['student', 'provider', 'business']), organisationId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (input.to !== 'student' && !ctx.actor.memberships.some((m) => m.type === input.to && m.organisationId === input.organisationId && m.status === 'active'))
        throw new TRPCError({ code: 'FORBIDDEN' })
      await logActivity(ctx.db, {
        actorUserId: ctx.user.id,
        actorIdentity: input.to,
        organisationId: input.organisationId ?? null,
        action: 'identity.switched',
        targetType: input.to === 'student' ? 'account' : 'organisation',
        targetId: input.organisationId ?? ctx.user.id,
        metadata: { to: input.to },
        ip: ctx.ip,
      })
      return { ok: true }
    }),

  // A provider's public profile (/providers/[slug]). New providers have one straight away; it stays out of search engines
  // until the provider is approved. Rejected and suspended providers have none.
  providerProfile: publicProcedure.input(z.object({ slug: z.string().max(80) })).query(async ({ ctx, input }) => {
    const [org] = await ctx.db
      .select({ name: organisations.name, slug: organisations.slug, status: organisations.status, createdAt: organisations.createdAt })
      .from(organisations)
      .where(and(eq(organisations.type, 'provider'), eq(organisations.slug, input.slug)))
    if (!org || org.status === 'rejected' || org.status === 'suspended') throw new TRPCError({ code: 'NOT_FOUND' })
    return { name: org.name, slug: org.slug, approved: org.status === 'active', since: org.createdAt }
  }),
})
