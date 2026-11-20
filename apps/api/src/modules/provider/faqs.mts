import { z } from 'zod'

import { asc, eq, organisations, providerFaqs, sql, type Db } from '@readtraining/db'

import { logActivity } from '../../lib/activity.mjs'
import { createTRPCRouter, orgProcedure } from '../../trpc/trpc.mjs'

// A provider's own FAQs (Settings › FAQs): questions about booking and training with that provider in general, with their
// answers, in order. They show on its public profile and on its courses that have their own page (never on a shared course
// page). Saved as the whole list at once, so adding, editing, reordering and removing are one save; not reviewed (like the
// profile's words).
export const MOST_FAQS = 20

const faq = z.object({
  question: z.string().trim().min(1, 'Enter the question.').max(200, 'Keep a question to 200 characters or fewer.'),
  answer: z.string().trim().min(1, 'Enter the answer.').max(2000, 'Keep an answer to 2000 characters or fewer.'),
})

export async function loadProviderFaqs(db: Pick<Db, 'select'>, organisationId: string): Promise<{ question: string; answer: string }[]> {
  return db.select({ question: providerFaqs.question, answer: providerFaqs.answer }).from(providerFaqs).where(eq(providerFaqs.organisationId, organisationId)).orderBy(asc(providerFaqs.position))
}

export const providerFaqsRouter = createTRPCRouter({
  list: orgProcedure('provider.settings.view').query(async ({ ctx, input }) => loadProviderFaqs(ctx.db, input.organisationId)),

  save: orgProcedure('provider.faqs.edit')
    .input(z.object({ faqs: z.array(faq).max(MOST_FAQS, `A provider can have up to ${MOST_FAQS} FAQs.`) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        // one save at a time for a provider (two tabs or two people): the provider's row is locked while the list is replaced
        await tx.execute(sql`select 1 from public.organisations where id = ${input.organisationId}::uuid for update`)
        await tx.delete(providerFaqs).where(eq(providerFaqs.organisationId, input.organisationId))
        if (input.faqs.length) await tx.insert(providerFaqs).values(input.faqs.map((f, i) => ({ organisationId: input.organisationId, position: i, question: f.question, answer: f.answer })))
        await tx.update(organisations).set({ updatedAt: new Date() }).where(eq(organisations.id, input.organisationId))
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'provider', organisationId: input.organisationId, action: 'provider.faqs_updated', targetType: 'organisation', targetId: input.organisationId, metadata: { count: input.faqs.length }, ip: ctx.ip })
        return input.faqs
      })
    }),
})
