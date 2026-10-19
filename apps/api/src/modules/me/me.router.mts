import { randomUUID } from 'node:crypto'

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { and, eq, inArray, isNull, organisations, profiles, sql } from '@readtraining/db'
import { adminPermissions, identitiesOf } from '@readtraining/permissions'

import { logActivity } from '../../lib/activity.mjs'
import { renderEmail, wordsFor } from '../../emails/templates.mjs'
import { checkCurrentPassword } from '../../lib/credentials.mjs'
import { sendEmail } from '../../lib/email.mjs'
import { AVATARS, requestEmailChange, signedPhotoUrl, siteUrl, supabase, updatePasswordAsUser } from '../../lib/supabase.mjs'
import { createTRPCRouter, protectedProcedure } from '../../trpc/trpc.mjs'

// Account settings, in Hurak's four parts: basic information, address, email (needs the current password) and password
// (current, new, repeat). Every change is checked here, saved, and written to the activity log.

const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}.`)
    .max(50, `Your ${label} must be 50 characters or fewer.`)
    .regex(/^[\p{L}][\p{L}\p{M} '’.-]*$/u, `Your ${label} can only use letters, spaces, hyphens and apostrophes.`)

const dateOfBirth = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth.')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= '1900-01-01' && d.getTime() < Date.now()
  }, 'Enter a real date of birth in the past.')

const phone = z
  .string()
  .trim()
  .refine((v) => /^\+?[\d\s()-]+$/.test(v) && v.replace(/\D/g, '').length >= 10 && v.replace(/\D/g, '').length <= 15, 'Enter a phone number, like 07700 900 982.')

const postcode = z
  .string()
  .trim()
  .regex(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, 'Enter a real postcode, like SW1A 1AA.')
  .transform((v) => v.toUpperCase().replace(/\s+/g, '').replace(/^(.+)(\d[A-Z]{2})$/, '$1 $2'))

const newPassword = z
  .string()
  .min(8, 'Enter a new password of at least 8 characters, with a letter and a number.')
  .max(72, 'Use a password of 72 characters or fewer.')
  .refine((v) => /[a-z]/i.test(v) && /\d/.test(v), 'Enter a new password of at least 8 characters, with a letter and a number.')

// A wrong current password, as a field error the form can show under the right field.
const fieldError = (field: string, message: string, code: 'BAD_REQUEST' | 'TOO_MANY_REQUESTS' = 'BAD_REQUEST') =>
  new TRPCError({ code, message, cause: Object.assign(new Error(message), { field }) })
const passwordProblem = (result: 'wrong' | 'no_password' | 'locked') =>
  result === 'locked'
    ? fieldError('currentPassword', 'Too many wrong passwords. Wait 15 minutes, then try again.', 'TOO_MANY_REQUESTS')
    : result === 'no_password'
      ? fieldError('currentPassword', 'Your account has no password yet. Use "Forgot password" on the log in page to set one.')
      : fieldError('currentPassword', 'Your current password is not right. Check it and try again.')

export const meRouter = createTRPCRouter({
  // The signed-in person: profile, sign-in details, the identities they can switch between, and admin switches (if any).
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, ctx.user.id) })
    if (!profile) throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' })
    const [auth] = await ctx.db.execute<{ email: string; email_confirmed_at: string | null; email_change: string | null; has_password: boolean }>(sql`
      select email, email_confirmed_at, nullif(email_change, '') as email_change, coalesce(encrypted_password, '') <> '' as has_password
      from auth.users where id = ${ctx.user.id}::uuid`)
    const ids = ctx.actor.memberships.map((m) => m.organisationId)
    const orgs = ids.length
      ? await ctx.db.select({ id: organisations.id, name: organisations.name, slug: organisations.slug }).from(organisations).where(inArray(organisations.id, ids))
      : []
    const byId = new Map(orgs.map((o) => [o.id, o]))
    return {
      id: ctx.user.id,
      email: auth?.email ?? ctx.user.email,
      emailVerified: Boolean(auth?.email_confirmed_at),
      pendingEmail: auth?.email_change ?? null,
      hasPassword: auth?.has_password ?? false,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        photoUrl: await signedPhotoUrl(profile.avatarUrl),
        dateOfBirth: profile.dateOfBirth,
        phone: profile.phone,
        street: profile.addressLine1,
        city: profile.city,
        postcode: profile.postcode,
        marketingOptIn: profile.marketingOptIn,
      },
      identities: identitiesOf(ctx.actor).map((i) => ('organisationId' in i ? { ...i, name: byId.get(i.organisationId)?.name ?? '', slug: byId.get(i.organisationId)?.slug ?? '' } : i)),
      admin: ctx.actor.admin ? { preset: ctx.actor.admin.preset, permissions: adminPermissions(ctx.actor.admin), twoStep: ctx.user.aal === 'aal2' } : null,
    }
  }),

  // Basic information. The name is also copied to the sign-in record, so the header and Supabase's emails use it.
  updateBasic: protectedProcedure
    .input(z.object({ firstName: name('first name'), lastName: name('last name'), dateOfBirth, phone }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx.update(profiles).set({ firstName: input.firstName, lastName: input.lastName, dateOfBirth: input.dateOfBirth, phone: input.phone }).where(eq(profiles.id, ctx.user.id))
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'student', action: 'profile.basic_updated', targetType: 'profile', targetId: ctx.user.id, ip: ctx.ip })
      })
      if (supabase) {
        const { data } = await supabase.auth.admin.getUserById(ctx.user.id)
        await supabase.auth.admin.updateUserById(ctx.user.id, { user_metadata: { ...(data.user?.user_metadata ?? {}), first_name: input.firstName, last_name: input.lastName } })
      }
      return { ok: true }
    }),

  updateAddress: protectedProcedure
    .input(z.object({ street: z.string().trim().min(1, 'Enter your street address.').max(100, 'Use 100 characters or fewer.'), city: z.string().trim().min(1, 'Enter your town or city.').max(60, 'Use 60 characters or fewer.'), postcode }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx.update(profiles).set({ addressLine1: input.street, city: input.city, postcode: input.postcode }).where(eq(profiles.id, ctx.user.id))
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'student', action: 'profile.address_updated', targetType: 'profile', targetId: ctx.user.id, ip: ctx.ip })
      })
      return { postcode: input.postcode }
    }),

  // Marketing emails: the consent given at sign-up, changeable at any time (UK GDPR / PECR). The time is kept as evidence.
  setMarketing: protectedProcedure.input(z.object({ optIn: z.boolean() })).mutation(async ({ ctx, input }) => {
    await ctx.db.transaction(async (tx) => {
      await tx.update(profiles).set({ marketingOptIn: input.optIn, marketingOptInAt: input.optIn ? new Date() : null }).where(eq(profiles.id, ctx.user.id))
      await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'student', action: input.optIn ? 'consent.marketing_given' : 'consent.marketing_withdrawn', targetType: 'profile', targetId: ctx.user.id, ip: ctx.ip })
    })
    return { ok: true }
  }),

  // Email settings: the new address plus the current password. Supabase then emails both addresses ("Secure email change");
  // the change happens when both links are opened (the database logs it).
  changeEmail: protectedProcedure
    .input(z.object({ email: z.string().trim().toLowerCase().email('Enter an email address in the correct format, like name@example.com.').max(254), currentPassword: z.string().min(1, 'Enter your current password.') }))
    .mutation(async ({ ctx, input }) => {
      if (input.email === ctx.user.email?.toLowerCase()) throw fieldError('email', 'This is already your email address.')
      const check = await checkCurrentPassword(ctx.db, ctx.user.id, input.currentPassword, ctx.ip)
      if (check !== 'ok') throw passwordProblem(check)
      const problem = await requestEmailChange(ctx.accessToken!, input.email, '/account/settings?email=confirmed')
      if (problem === 'email_exists') throw fieldError('email', "That email address can't be used. If it's yours on another account, contact us.")
      if (problem === 'over_email_send_rate_limit') throw fieldError('email', 'Too many emails sent. Wait a few minutes, then try again.', 'TOO_MANY_REQUESTS')
      // Supabase refuses addresses it won't email (for example reserved test domains like example.com)
      if (problem === 'email_address_invalid') throw fieldError('email', "We can't send email to that address. Check it, or use a different one.")
      // the email service refused or isn't set up (Supabase's built-in mailer only sends to the project's team)
      if (problem === 'email_address_not_authorized' || problem === 'unexpected_failure' || problem === '500')
        throw new TRPCError({ code: 'SERVICE_UNAVAILABLE', message: "We can't send emails right now, so your email can't be changed yet. Please try again later." })
      if (problem) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: "We couldn't start the email change. Please try again." })
      return { pendingEmail: input.email }
    }),

  // Password settings: current, new and repeat. Changed as the person (their own token), so this device stays signed in
  // and Supabase signs out their other devices. (The service-role update would sign out every device, this one included.)
  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string().min(1, 'Enter your current password.'), newPassword }))
    .mutation(async ({ ctx, input }) => {
      if (input.newPassword === input.currentPassword) throw fieldError('newPassword', 'Choose a new password that is different from your current one.')
      const check = await checkCurrentPassword(ctx.db, ctx.user.id, input.currentPassword, ctx.ip)
      if (check !== 'ok') throw passwordProblem(check)
      const problem = await updatePasswordAsUser(ctx.accessToken!, input.newPassword, input.currentPassword)
      if (problem === 'weak_password') throw fieldError('newPassword', 'Choose a stronger password: at least 8 characters, with letters and numbers.')
      if (problem === 'same_password') throw fieldError('newPassword', 'Choose a new password that is different from your current one.')
      if (problem) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: "We couldn't change your password. Please try again." })
      return { ok: true }
    }),

  // Profile photo: a one-time upload address for the browser, then `setPhoto` with the uploaded path.
  photoUploadUrl: protectedProcedure.input(z.object({ contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']) })).mutation(async ({ ctx, input }) => {
    if (!supabase) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
    const path = `${ctx.user.id}/${randomUUID()}.${PHOTO_TYPES[input.contentType]}`
    const { data, error } = await supabase.storage.from(AVATARS).createSignedUploadUrl(path)
    if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: "We couldn't prepare the upload. Please try again." })
    return { path: data.path, token: data.token }
  }),

  setPhoto: protectedProcedure.input(z.object({ path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/) })).mutation(async ({ ctx, input }) => {
    if (!supabase) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
    // only a file in this person's own folder that was really uploaded
    if (!input.path.startsWith(`${ctx.user.id}/`)) throw new TRPCError({ code: 'FORBIDDEN' })
    const file = input.path.split('/')[1]
    const { data: found } = await supabase.storage.from(AVATARS).list(ctx.user.id, { search: file })
    if (!found?.some((f) => f.name === file)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'The photo did not upload. Please try again.' })
    const before = await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, ctx.user.id), columns: { avatarUrl: true } })
    await ctx.db.transaction(async (tx) => {
      await tx.update(profiles).set({ avatarUrl: input.path }).where(eq(profiles.id, ctx.user.id))
      await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'student', action: 'profile.photo_updated', targetType: 'profile', targetId: ctx.user.id, ip: ctx.ip })
    })
    if (before?.avatarUrl && !/^https:\/\//.test(before.avatarUrl) && before.avatarUrl !== input.path) await supabase.storage.from(AVATARS).remove([before.avatarUrl])
    return { photoUrl: await signedPhotoUrl(input.path) }
  }),

  removePhoto: protectedProcedure.mutation(async ({ ctx }) => {
    const before = await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, ctx.user.id), columns: { avatarUrl: true } })
    await ctx.db.transaction(async (tx) => {
      await tx.update(profiles).set({ avatarUrl: null }).where(eq(profiles.id, ctx.user.id))
      await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'student', action: 'profile.photo_removed', targetType: 'profile', targetId: ctx.user.id, ip: ctx.ip })
    })
    if (supabase && before?.avatarUrl && !/^https:\/\//.test(before.avatarUrl)) await supabase.storage.from(AVATARS).remove([before.avatarUrl])
    return { ok: true }
  }),

  // The welcome email: once per account, after its first confirmed sign-in (the confirm link, Google, or a later log-in as a
  // fallback). The row is claimed first, so two sign-ins at the same moment can't send it twice; if sending fails the claim is
  // released and the next sign-in tries again.
  welcome: protectedProcedure.mutation(async ({ ctx }) => {
    const [auth] = await ctx.db.execute<{ email: string; confirmed: boolean }>(sql`
      select email, email_confirmed_at is not null as confirmed from auth.users where id = ${ctx.user.id}::uuid`)
    if (!auth?.confirmed) return { sent: false }
    const [claimed] = await ctx.db
      .update(profiles)
      .set({ welcomeSentAt: new Date() })
      .where(and(eq(profiles.id, ctx.user.id), isNull(profiles.welcomeSentAt)))
      .returning({ firstName: profiles.firstName })
    if (!claimed) return { sent: false }
    const sent = await sendEmail(renderEmail('welcome', await wordsFor(ctx.db, 'welcome'), { firstName: claimed.firstName }, siteUrl, auth.email))
    if (!sent) {
      await ctx.db.update(profiles).set({ welcomeSentAt: null }).where(eq(profiles.id, ctx.user.id))
      return { sent: false }
    }
    await logActivity(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'system', action: 'email.welcome_sent', targetType: 'account', targetId: ctx.user.id, metadata: {}, ip: ctx.ip })
    return { sent: true }
  }),
})
