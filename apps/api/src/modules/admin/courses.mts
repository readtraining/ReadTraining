import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { and, courseRevisions, courses, eq, sql } from '@readtraining/db'
import { can } from '@readtraining/permissions'
import type { AdminAction } from '@readtraining/permissions'

import { renderEmail, wordsFor } from '../../emails/templates.mjs'
import { logActivity } from '../../lib/activity.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { sendEmail } from '../../lib/email.mjs'
import { IMAGE_TYPES, MEDIA_PATH } from '../../lib/media.mjs'
import { siteUrl } from '../../lib/supabase.mjs'
import { adminProcedure, createTRPCRouter, refuse } from '../../trpc/trpc.mjs'
import { loadListings } from '../catalogue/listings.mjs'
import {
  addCourseImage,
  applyContent,
  bad,
  content,
  courseDetail,
  courseImageUploadUrl,
  courseSlug,
  deleteCourse,
  missing,
  notFound,
  resolveCatalogue,
  REVIEWED,
  setCourseImages,
} from '../provider/courses.mjs'

// Courses for the admin (Milestone 2): the approvals queue (new courses, and changes to live courses), every course in the
// catalogue, and the shared course pages ReadTraining's team writes. Every admin can look; deciding needs the "approve" switch
// and is never done by the person who sent the course or the change; shared pages need the "catalogue" switch and go live when
// published (no approval). Each decision saves the reason (the provider sees it), is logged, and emails the provider's owner.

type Course = typeof courses.$inferSelect
type Decision = 'approve' | 'changes' | 'approveChange' | 'rejectChange' | 'pause' | 'resume'

const id = z.number().int().positive()
const iso = (t: string | Date | null) => (t ? new Date(t).toISOString() : null)

const DECISIONS: Record<Decision, { from: Course['status'][]; message: boolean; email: string | null; log: string; messageError?: string }> = {
  approve: { from: ['pending'], message: false, email: 'course-approved', log: 'admin.course_approved' },
  changes: { from: ['pending'], message: true, email: 'course-changes', log: 'admin.course_changes_requested', messageError: 'Enter what the provider needs to change.' },
  approveChange: { from: ['live', 'paused'], message: false, email: 'course-change-approved', log: 'admin.course_change_approved' },
  rejectChange: { from: ['live', 'paused'], message: true, email: 'course-change-rejected', log: 'admin.course_change_rejected', messageError: 'Enter why the change is not approved.' },
  pause: { from: ['live'], message: true, email: 'course-paused', log: 'admin.course_paused', messageError: 'Enter why the course is paused. The provider sees it.' },
  resume: { from: ['paused'], message: false, email: null, log: 'admin.course_resumed' },
}

async function findCourse(db: typeof Db, courseId: number) {
  const [c] = await db.select().from(courses).where(eq(courses.id, courseId))
  if (!c) throw notFound()
  return c
}
async function sharedPage(db: typeof Db, courseId: number) {
  const c = await findCourse(db, courseId)
  if (c.kind !== 'shared') throw notFound()
  return c
}

const logFor = (ctx: { user: { id: string }; ip: string | null }, course: Course, action: string, metadata: Record<string, unknown> = {}) => (tx: Parameters<typeof logActivity>[0]) =>
  logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: course.organisationId, action, targetType: 'course', targetId: String(course.id), metadata, ip: ctx.ip })

// the provider's owner, emailed about a decision; an email that can't be sent doesn't undo the decision (the answer says so)
async function emailOwner(db: typeof Db, course: Course, key: string, message: string | null) {
  if (!course.organisationId) return false
  const [o] = await db.execute<{ name: string; email: string | null; first_name: string | null }>(sql`
    select o.name, u.email, p.first_name from public.organisations o
    join public.organisation_members m on m.organisation_id = o.id and m.role = 'owner'
    join auth.users u on u.id = m.user_id left join public.profiles p on p.id = m.user_id
    where o.id = ${course.organisationId}::uuid limit 1`)
  if (!o?.email) return false
  const vars = { firstName: o.first_name ?? '', provider: o.name, course: course.title, courseId: String(course.id), message: message ?? '' }
  const sent = await sendEmail(renderEmail(key, await wordsFor(db, key), vars, siteUrl, o.email))
  if (sent) await logActivity(db, { actorUserId: null, actorIdentity: 'system', organisationId: course.organisationId, action: 'email.course_decision_sent', targetType: 'course', targetId: String(course.id), metadata: { email: key }, ip: null })
  return sent
}

// a waiting change shown against the live version, field by field, in the editor's shape (catalogue places as slugs)
async function changeView(db: typeof Db, detail: Awaited<ReturnType<typeof courseDetail>>) {
  const proposed = (detail.pendingChanges?.content ?? null) as Record<string, unknown> | null
  if (!proposed) return null
  const fields = (REVIEWED as readonly string[]).filter((k) => proposed[k] !== undefined && JSON.stringify(proposed[k]) !== JSON.stringify((detail as Record<string, unknown>)[k] ?? (Array.isArray(proposed[k]) ? [] : null)))
  return { since: detail.pendingChanges!.since, fields: fields.map((k) => ({ key: k, now: (detail as Record<string, unknown>)[k] ?? null, proposed: proposed[k] })) }
}

export const adminCoursesRouter = createTRPCRouter({
  // How many are waiting (the menu badge and the dashboard), and how many courses there are in each state.
  counts: adminProcedure('admin.panel.open').query(async ({ ctx }) => {
    const [r] = await ctx.db.execute<{ waiting: number; overdue: number; changes: number; live: number; paused: number; draft: number; shared: number }>(sql`
      select (select count(*)::int from public.courses where status = 'pending') + (select count(*)::int from public.course_revisions where status = 'pending') waiting,
             (select count(*)::int from public.courses where status = 'pending' and submitted_at < now() - interval '2 days')
               + (select count(*)::int from public.course_revisions where status = 'pending' and submitted_at < now() - interval '2 days') overdue,
             count(*) filter (where status = 'changes' and kind = 'provider')::int changes, count(*) filter (where status = 'live')::int live,
             count(*) filter (where status = 'paused')::int paused, count(*) filter (where status = 'draft')::int draft, count(*) filter (where kind = 'shared')::int shared
      from public.courses`)
    return r
  }),

  // The approvals queue. Waiting: new courses and changes to live courses, oldest first so nothing waits silently. Changes asked:
  // courses sent back to their provider. Decided: the latest 100 decisions.
  queue: adminProcedure('admin.panel.open')
    .input(z.object({ tab: z.enum(['waiting', 'changes', 'decided']) }))
    .query(async ({ ctx, input }) => {
      type Row = { course_id: number; title: string; type: 'new' | 'change'; at: string; note: string | null; outcome: string | null; provider: string | null; provider_status: string | null; method: string | null; parent: string | null }
      const base = sql`(select name from public.organisations o where o.id = c.organisation_id) provider, (select status from public.organisations o where o.id = c.organisation_id) provider_status, c.method, (select p.title from public.courses p where p.id = c.parent_id) parent`
      const rows =
        input.tab === 'waiting'
          ? await ctx.db.execute<Row>(sql`
              select * from (
                select c.id course_id, c.title, 'new' as type, c.submitted_at at, null as note, null as outcome, ${base} from public.courses c where c.status = 'pending'
                union all
                select c.id, c.title, 'change', r.submitted_at, null, null, ${base} from public.course_revisions r join public.courses c on c.id = r.course_id where r.status = 'pending'
              ) q order by at asc`)
          : input.tab === 'changes'
            ? await ctx.db.execute<Row>(sql`select c.id course_id, c.title, 'new' as type, c.decided_at at, c.status_note note, 'changes' as outcome, ${base} from public.courses c where c.status = 'changes' and c.kind = 'provider' order by c.decided_at desc nulls last`)
            : await ctx.db.execute<Row>(sql`
                select * from (
                  select c.id course_id, c.title, 'new' as type, c.decided_at at, null as note, 'approved' as outcome, ${base} from public.courses c where c.kind = 'provider' and c.status in ('live', 'paused') and c.decided_at is not null
                  union all
                  select c.id, c.title, 'change', r.decided_at, r.note, r.status::text, ${base} from public.course_revisions r join public.courses c on c.id = r.course_id where r.status <> 'pending'
                ) q order by at desc nulls last limit 100`)
      return rows.map((r) => ({ courseId: r.course_id, title: r.title, type: r.type, at: iso(r.at), note: r.note, outcome: r.outcome, provider: r.provider, providerStatus: r.provider_status, method: r.method, parent: r.parent }))
    }),

  // Every course, newest change first: shared pages and providers' courses, with search and filters.
  // Every live course, for the admin's pickers: a staff booking (a provider's own course), a coupon's courses and the home page's
  // featured courses (`listed`: it has its own place in the public listings). `fromPence`: the lowest price of a bookable
  // upcoming date, or the self-paced price.
  options: adminProcedure('admin.panel.open').query(async ({ ctx }) => {
    const [rows, listed] = await Promise.all([
      ctx.db.execute<{ id: number; title: string; kind: 'shared' | 'provider'; provider_id: string | null; provider: string | null; parent: string | null; from_pence: number | null }>(sql`
        select c.id, c.title, c.kind, c.organisation_id provider_id, o.name provider, (select p.title from public.courses p where p.id = c.parent_id) parent,
               coalesce(c.price_pence, (select min(k.price_pence) from public.cohorts k where k.course_id = c.id and k.cancelled_at is null and k.bookable and k.starts_on >= current_date)) from_pence
        from public.courses c left join public.organisations o on o.id = c.organisation_id
        where c.status = 'live' and (c.kind = 'shared' or o.status = 'active')
        order by c.title, o.name`),
      loadListings(ctx.db),
    ])
    const ids = new Set(listed.map((l) => l.id))
    return rows.map((r) => ({ id: r.id, title: r.title, kind: r.kind, providerId: r.provider_id, provider: r.provider, parent: r.parent, fromPence: r.from_pence, listed: ids.has(r.id) }))
  }),
  list: adminProcedure('admin.panel.open')
    .input(z.object({ kind: z.enum(['all', 'shared', 'provider']).default('all'), status: z.enum(['all', 'draft', 'pending', 'changes', 'live', 'paused']).default('all'), q: z.string().trim().max(80).optional() }))
    .query(async ({ ctx, input }) => {
      const where = [sql`true`]
      if (input.kind !== 'all') where.push(sql`c.kind = ${input.kind}`)
      if (input.status !== 'all') where.push(sql`c.status = ${input.status}`)
      if (input.q) {
        const like = `%${input.q.replace(/[\\%_]/g, (x) => `\\${x}`)}%`
        where.push(sql`(c.title ilike ${like} or c.slug ilike ${like} or c.id::text = ${input.q} or exists (select 1 from public.organisations o where o.id = c.organisation_id and o.name ilike ${like}))`)
      }
      const rows = await ctx.db.execute<{ id: number; title: string; slug: string; kind: string; status: string; method: string | null; updated_at: string; provider: string | null; parent: string | null; upcoming: number; from_pence: number | null; providers: number; pending_change: boolean }>(sql`
        select c.id, c.title, c.slug, c.kind, c.status, c.method, c.updated_at,
               (select name from public.organisations o where o.id = c.organisation_id) provider,
               (select p.title from public.courses p where p.id = c.parent_id) parent,
               (select count(*)::int from public.cohorts k where k.cancelled_at is null and k.ends_on >= current_date and (k.course_id = c.id or k.course_id in (select x.id from public.courses x where x.parent_id = c.id and x.status = 'live'))) upcoming,
               coalesce(c.price_pence, (select min(k.price_pence) from public.cohorts k where k.cancelled_at is null and k.ends_on >= current_date and (k.course_id = c.id or k.course_id in (select x.id from public.courses x where x.parent_id = c.id and x.status = 'live')))) from_pence,
               (select count(*)::int from public.courses x where x.parent_id = c.id and x.status = 'live') providers,
               exists (select 1 from public.course_revisions r where r.course_id = c.id and r.status = 'pending') pending_change
        from public.courses c where ${sql.join(where, sql` and `)}
        order by c.updated_at desc limit 300`)
      return rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug, kind: r.kind, status: r.status, method: r.method, updatedAt: iso(r.updated_at), provider: r.provider, parent: r.parent, upcoming: r.upcoming, fromPence: r.from_pence, providers: r.providers, pendingChange: r.pending_change }))
    }),

  // One course as the editor shows it, with its provider, a waiting change field by field, and (for a shared page) the
  // providers' courses listed on it.
  get: adminProcedure('admin.panel.open')
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => {
      const course = await findCourse(ctx.db, input.courseId)
      const detail = await courseDetail(ctx.db, course)
      const [provider] = course.organisationId
        ? await ctx.db.execute<{ id: string; name: string; slug: string; status: string }>(sql`select id, name, slug, status from public.organisations where id = ${course.organisationId}::uuid`)
        : []
      const children =
        course.kind === 'shared'
          ? await ctx.db.execute<{ id: number; title: string; status: string; provider: string; upcoming: number }>(sql`
              select c.id, c.title, c.status, o.name provider,
                     (select count(*)::int from public.cohorts k where k.course_id = c.id and k.cancelled_at is null and k.ends_on >= current_date) upcoming
              from public.courses c join public.organisations o on o.id = c.organisation_id where c.parent_id = ${course.id} order by o.name`)
          : []
      return { ...detail, provider: provider ?? null, children, change: await changeView(ctx.db, detail) }
    }),

  // A decision on a provider's course: approve it, ask for changes, approve or turn down a change to a live course, pause a live
  // course or put it back. The person who sent the course or the change can't decide on it.
  decide: adminProcedure('admin.panel.open')
    .input(z.object({ courseId: id, decision: z.enum(['approve', 'changes', 'approveChange', 'rejectChange', 'pause', 'resume']), message: z.string().trim().max(2000).optional() }))
    .mutation(async ({ ctx, input, path }) => {
      const rule = DECISIONS[input.decision]
      const course = await findCourse(ctx.db, input.courseId)
      if (course.kind !== 'provider') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Shared course pages are published from the catalogue, not approved.' })
      const isChange = input.decision === 'approveChange' || input.decision === 'rejectChange'
      const [revision] = isChange ? await ctx.db.select().from(courseRevisions).where(and(eq(courseRevisions.courseId, course.id), eq(courseRevisions.status, 'pending'))) : []
      const action: AdminAction = 'admin.approvals.decide'
      const createdBy = isChange ? revision?.submittedBy : course.createdBy
      if (!can(ctx.actor, action, { createdBy: createdBy ?? undefined })) await refuse(ctx, action, course.organisationId, path)
      if (!rule.from.includes(course.status) || (isChange && !revision)) throw new TRPCError({ code: 'CONFLICT', message: 'This course has changed since you opened it. Reload the page to see it.' })
      const message = input.message?.trim() || null
      if (rule.message && !message) throw bad(rule.messageError!, 'message')
      if (input.decision === 'approve' || input.decision === 'resume') {
        const [o] = await ctx.db.execute<{ status: string }>(sql`select status from public.organisations where id = ${course.organisationId}::uuid`)
        if (o?.status !== 'active') throw new TRPCError({ code: 'CONFLICT', message: 'This provider isn’t approved yet (or is suspended). Decide on the provider first, on the Providers page.' })
      }
      const now = new Date()
      await ctx.db.transaction(async (tx) => {
        if (input.decision === 'approve') await tx.update(courses).set({ status: 'live', statusNote: null, decidedAt: now, decidedBy: ctx.user.id, publishedAt: course.publishedAt ?? now, updatedAt: now }).where(eq(courses.id, course.id))
        if (input.decision === 'changes') await tx.update(courses).set({ status: 'changes', statusNote: message, decidedAt: now, decidedBy: ctx.user.id, updatedAt: now }).where(eq(courses.id, course.id))
        if (input.decision === 'pause') await tx.update(courses).set({ status: 'paused', statusNote: message, updatedAt: now }).where(eq(courses.id, course.id))
        if (input.decision === 'resume') await tx.update(courses).set({ status: 'live', statusNote: null, updatedAt: now }).where(eq(courses.id, course.id))
        if (input.decision === 'approveChange') {
          await applyContent(tx, course.id, revision.content as Record<string, unknown>)
          await tx.update(courseRevisions).set({ status: 'approved', decidedAt: now, decidedBy: ctx.user.id }).where(eq(courseRevisions.id, revision.id))
        }
        if (input.decision === 'rejectChange') await tx.update(courseRevisions).set({ status: 'rejected', note: message, decidedAt: now, decidedBy: ctx.user.id }).where(eq(courseRevisions.id, revision.id))
        await logFor(ctx, course, rule.log, { from: course.status, ...(message ? { message } : {}) })(tx)
      })
      const fresh = await findCourse(ctx.db, course.id)
      const emailed = rule.email ? await emailOwner(ctx.db, fresh, rule.email, message) : false
      return { status: fresh.status, emailed }
    }),

  // ---- shared course pages (the "catalogue" switch) --------------------------------------------------------------------------

  // A new shared page: a title and its place in the catalogue. It starts as a draft; the editor fills in the rest.
  createShared: adminProcedure('admin.catalogue.edit')
    .input(z.object({ title: content.title, category: content.category, subcategory: content.subcategory, topic: content.topic }))
    .mutation(async ({ ctx, input }) => {
      const resolved = await resolveCatalogue(ctx.db, { category: input.category, subcategory: input.subcategory, topic: input.topic ?? null })
      const slug = await courseSlug(ctx.db, input.title)
      return ctx.db.transaction(async (tx) => {
        const [made] = await tx.insert(courses).values({ kind: 'shared', slug, title: input.title, ...resolved, createdBy: ctx.user.id }).returning()
        await logFor(ctx, made, 'admin.shared_course_created', { title: input.title })(tx)
        return { id: made.id }
      })
    }),

  // Save a shared page's editor: its wording and lists change at once (staff write it, so there is no approval), and its search
  // settings.
  updateShared: adminProcedure('admin.catalogue.edit')
    .input(
      z.object({
        courseId: id,
        ...Object.fromEntries(Object.entries(content).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])),
        seoTitle: z.string().trim().max(60).nullable().optional(),
        seoDescription: z.string().trim().max(320).nullable().optional(),
        seoKeywords: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
        listed: z.boolean().optional(),
      }) as z.ZodType<{ courseId: number; seoTitle?: string | null; seoDescription?: string | null; seoKeywords?: string[]; listed?: boolean } & Partial<Record<keyof typeof content, unknown>>>,
    )
    .mutation(async ({ ctx, input }) => {
      const course = await sharedPage(ctx.db, input.courseId)
      const { courseId, seoTitle, seoDescription, seoKeywords, listed, ...rest } = input
      void courseId
      if (rest.subcategory !== undefined && rest.category === undefined) throw bad('Choose the category with the sub-category.', 'category')
      const reviewed = Object.fromEntries(Object.entries(rest).filter(([k, v]) => v !== undefined && (REVIEWED as readonly string[]).includes(k)))
      await ctx.db.transaction(async (tx) => {
        if (Object.keys(reviewed).length) await applyContent(tx, course.id, reviewed)
        const direct: Partial<typeof courses.$inferInsert> = {}
        if (seoTitle !== undefined) direct.seoTitle = seoTitle || null
        if (seoDescription !== undefined) direct.seoDescription = seoDescription || null
        if (seoKeywords !== undefined) direct.seoKeywords = [...new Set(seoKeywords.map((w) => w.toLowerCase()))]
        if (listed !== undefined) direct.listed = listed
        if (Object.keys(direct).length) await tx.update(courses).set({ ...direct, updatedAt: new Date() }).where(eq(courses.id, course.id))
        await logFor(ctx, course, 'admin.shared_course_updated', { fields: Object.keys(input).filter((k) => k !== 'courseId') })(tx)
      })
      return { ok: true, pendingChange: false }
    }),

  // Publish a shared page (once nothing required is missing), take it off the site, or put it back.
  setSharedStatus: adminProcedure('admin.catalogue.edit')
    .input(z.object({ courseId: id, status: z.enum(['live', 'paused']) }))
    .mutation(async ({ ctx, input }) => {
      const course = await sharedPage(ctx.db, input.courseId)
      if (course.status === input.status) return { ok: true }
      if (input.status === 'live') {
        const gaps = await missing(ctx.db, course)
        if (gaps.length) throw bad(`Add ${gaps.join(', ')} before publishing it.`)
      } else if (course.status !== 'live') throw new TRPCError({ code: 'CONFLICT', message: 'Only a live page can be taken off the site.' })
      const now = new Date()
      await ctx.db.transaction(async (tx) => {
        await tx.update(courses).set({ status: input.status, publishedAt: course.publishedAt ?? (input.status === 'live' ? now : null), updatedAt: now }).where(eq(courses.id, course.id))
        await logFor(ctx, course, input.status === 'live' ? 'admin.shared_course_published' : 'admin.shared_course_paused')(tx)
      })
      return { ok: true }
    }),

  sharedImageUploadUrl: adminProcedure('admin.catalogue.edit')
    .input(z.object({ courseId: id, contentType: z.enum(Object.keys(IMAGE_TYPES) as [keyof typeof IMAGE_TYPES, ...(keyof typeof IMAGE_TYPES)[]]) }))
    .mutation(async ({ ctx, input }) => courseImageUploadUrl(await sharedPage(ctx.db, input.courseId), input.contentType)),

  sharedAddImage: adminProcedure('admin.catalogue.edit')
    .input(z.object({ courseId: id, path: z.string().regex(MEDIA_PATH), alt: z.string().trim().max(140).optional() }))
    .mutation(async ({ ctx, input }) => {
      const course = await sharedPage(ctx.db, input.courseId)
      return addCourseImage(ctx.db, course, input.path, input.alt, logFor(ctx, course, 'admin.shared_course_image_added'))
    }),

  sharedSetImages: adminProcedure('admin.catalogue.edit')
    .input(z.object({ courseId: id, images: z.array(z.object({ id: z.string().uuid(), alt: z.string().trim().max(140) })).max(10) }))
    .mutation(async ({ ctx, input }) => {
      const course = await sharedPage(ctx.db, input.courseId)
      return setCourseImages(ctx.db, course, input.images, (tx, m) => logFor(ctx, course, 'admin.shared_course_images_changed', m)(tx))
    }),

  // Delete a shared page that has never been live and has no provider courses on it.
  removeShared: adminProcedure('admin.catalogue.edit')
    .input(z.object({ courseId: id }))
    .mutation(async ({ ctx, input }) => {
      const course = await sharedPage(ctx.db, input.courseId)
      const [n] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(courses).where(eq(courses.parentId, course.id))
      if (n.n) throw new TRPCError({ code: 'CONFLICT', message: 'Providers’ courses are listed on this page, so it can’t be deleted. Take it off the site instead.' })
      return deleteCourse(ctx.db, course, (tx, m) => logFor(ctx, course, 'admin.shared_course_deleted', m)(tx))
    }),
})
