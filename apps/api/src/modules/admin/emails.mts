import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { siteContent, sql } from '@readtraining/db'

import { TEMPLATES, editableTemplate, renderEmail, wordsSchema, type Words } from '../../emails/templates.mjs'
import { logActivity } from '../../lib/activity.mjs'
import { emailConfigured, sendEmail } from '../../lib/email.mjs'
import { siteUrl } from '../../lib/supabase.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// Notifications & Email Templates (Part B, B3): every automated email with who gets it and when, and each one's words. Saving
// and resetting the words go through content.save / content.reset (key email:<template>, the "content" switch, with history);
// here are the list, one template, a preview of unsaved words, and a test sent to the signed-in admin's own address.

const keyInput = z.object({ key: z.string().max(60) })
const draft = keyInput.extend({ words: z.object({ subject: z.string().max(400), heading: z.string().max(400), body: z.string().max(8000), button: z.string().max(200) }) })
const notFound = () => new TRPCError({ code: 'NOT_FOUND', message: 'That email does not exist.' })

// unsaved words checked as a save would check them, so a preview or test never shows something that can't be saved
function checked(key: string, words: Words) {
  const parsed = wordsSchema(key).safeParse(words)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new TRPCError({ code: 'BAD_REQUEST', message: issue.message, cause: Object.assign(new Error(issue.message), { field: issue.path.join('.') }) })
  }
  return parsed.data as Words
}

export const emailsRouter = createTRPCRouter({
  list: adminProcedure('admin.panel.open').query(async ({ ctx }) => {
    const rows = await ctx.db.execute<{ key: string; updated_at: string }>(sql`select key, updated_at from ${siteContent} where key like 'email:%'`)
    const changed = new Map(rows.map((r) => [r.key.slice(6), new Date(r.updated_at).toISOString()]))
    return Object.entries(TEMPLATES).map(([key, t]) => ({ key, name: t.name, audience: t.audience, trigger: t.trigger, status: t.status, subject: t.words.subject, changedAt: changed.get(key) ?? null }))
  }),

  // One template: what it is, its built-in words, the saved words (if any) and the placeholders it may use.
  get: adminProcedure('admin.panel.open')
    .input(keyInput)
    .query(async ({ ctx, input }) => {
      const t = editableTemplate(input.key)
      if (!t) throw notFound()
      const [row] = await ctx.db.execute<{ value: Words }>(sql`select value from ${siteContent} where key = ${`email:${input.key}`}`)
      return { key: input.key, name: t.name, audience: t.audience, trigger: t.trigger, status: t.status, placeholders: t.placeholders, required: t.required ?? [], hasButton: Boolean(t.link), builtIn: t.words, saved: row?.value ?? null, sample: t.sample }
    }),

  // The email as it would arrive, with the template's sample details (Sam, Harbour Training Group…).
  preview: adminProcedure('admin.panel.open')
    .input(draft)
    .query(({ input }) => {
      const t = editableTemplate(input.key)
      if (!t) throw notFound()
      const email = renderEmail(input.key, checked(input.key, input.words), t.sample, siteUrl, 'preview@example.com')
      return { subject: email.subject, html: email.html, text: email.text }
    }),

  // A test of these words to the admin's own address, marked [Test] in the subject; logged.
  sendTest: adminProcedure('admin.content.edit')
    .input(draft)
    .mutation(async ({ ctx, input }) => {
      const t = editableTemplate(input.key)
      if (!t) throw notFound()
      if (!emailConfigured()) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Email sending is not set up yet, so a test can’t be sent.' })
      const [me] = await ctx.db.execute<{ email: string }>(sql`select email from auth.users where id = ${ctx.user.id}::uuid`)
      const email = renderEmail(input.key, checked(input.key, input.words), t.sample, siteUrl, me.email)
      const sent = await sendEmail({ ...email, subject: `[Test] ${email.subject}` })
      if (!sent) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'The test could not be sent. Try again in a few minutes.' })
      await logActivity(ctx.db, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.email_test_sent', targetType: 'content', targetId: `email:${input.key}`, metadata: { key: `email:${input.key}` }, ip: ctx.ip })
      return { to: me.email }
    }),
})
