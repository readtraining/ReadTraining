import { TRPCError } from '@trpc/server'

import { sql } from '@readtraining/db'

import { logActivity } from './activity.mjs'
import { STAFF_IDLE_MS } from './actor.mjs'
import type { db as Db } from './db.mjs'
import { notify, ownerOf } from './notify.mjs'

// An admin working in a provider's workspace as ReadTraining staff (the `staff_access` table; the permission rules are
// packages/permissions `staff`, the session is loaded with the admin in lib/actor.mts). Opening one needs no form (its reason is recorded as edited from the admin); it ends
// with End, after two hours unused, or when the admin opens another provider. When it ends, the provider's owner is emailed
// one summary of what was changed in it (nothing is sent when nothing changed).

type Ctx = { db: typeof Db; user: { id: string }; ip: string | null }

// Open a provider's workspace. Any session the admin still has open is ended first (one at a time), and the summaries of
// ended sessions not yet sent go out.
export async function startStaffAccess(ctx: Ctx, organisationId: string, reason: string) {
  const [org] = await ctx.db.execute<{ type: string; status: string; name: string }>(sql`select type, status, name from public.organisations where id = ${organisationId}::uuid`)
  if (!org || org.type !== 'provider') throw new TRPCError({ code: 'NOT_FOUND', message: 'This provider no longer exists.' })
  // until our team approves a provider there are no courses, dates or plans to work on; a rejected one is closed
  if (org.status !== 'active' && org.status !== 'suspended') throw new TRPCError({ code: 'BAD_REQUEST', message: 'You can work in a provider’s workspace once the provider is approved (it is active or suspended).' })
  const id = await ctx.db.transaction(async (tx) => {
    const ended = await tx.execute<{ id: string; organisation_id: string }>(sql`
      update public.staff_access set ended_at = now(), ended_how = 'replaced' where admin_user_id = ${ctx.user.id}::uuid and ended_at is null returning id, organisation_id`)
    for (const e of ended) await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: e.organisation_id, action: 'admin.staff_access_ended', targetType: 'staff_access', targetId: e.id, metadata: { how: 'replaced' }, ip: ctx.ip })
    const [row] = await tx.execute<{ id: string }>(sql`
      insert into public.staff_access (admin_user_id, organisation_id, reason) values (${ctx.user.id}::uuid, ${organisationId}::uuid, ${reason}) returning id`)
    await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId, action: 'admin.staff_access_started', targetType: 'staff_access', targetId: row.id, metadata: { reason }, ip: ctx.ip })
    return row.id
  })
  await sendStaffSummaries(ctx)
  return { id, provider: org.name }
}

// End the admin's open session (End in the workspace's banner), then send its summary
export async function endStaffAccess(ctx: Ctx) {
  const ended = await ctx.db.transaction(async (tx) => {
    const rows = await tx.execute<{ id: string; organisation_id: string; slug: string | null }>(sql`
      update public.staff_access s set ended_at = now(), ended_how = 'ended' where admin_user_id = ${ctx.user.id}::uuid and ended_at is null
      returning s.id, s.organisation_id, (select slug from public.organisations o where o.id = s.organisation_id) slug`)
    for (const e of rows) await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', organisationId: e.organisation_id, action: 'admin.staff_access_ended', targetType: 'staff_access', targetId: e.id, metadata: { how: 'ended' }, ip: ctx.ip })
    return rows[0] ?? null
  })
  await sendStaffSummaries(ctx)
  return { providerSlug: ended?.slug ?? null }
}

// What a staff change did, in the provider's words (the summary email; the activity log has the details)
const DONE: Record<string, string> = {
  'course.updated': 'Updated the course',
  'course.image_added': 'Added a picture to the course',
  'course.images_changed': 'Changed the course’s pictures',
  'course.option_stopped': 'Stopped bookings for a learning option of',
  'course.option_reopened': 'Reopened bookings for a learning option of',
  'cohort.created': 'Added a date to',
  'cohort.updated': 'Changed a date of',
  'cohort.cancelled': 'Cancelled a date of',
  'cohort.deleted': 'Removed a date of',
  'cohort.bookings_off': 'Stopped bookings on a date of',
  'cohort.bookings_on': 'Reopened bookings on a date of',
  'plan.created': 'Added the price plan',
  'plan.updated': 'Changed the price plan',
  'plan.archived': 'Archived the price plan',
  'plan.restored': 'Restored the price plan',
  'plan.deleted': 'Deleted the price plan',
  'venue.created': 'Added the venue',
  'venue.updated': 'Changed the venue',
  'venue.archived': 'Archived the venue',
  'venue.restored': 'Restored the venue',
  'venue.deleted': 'Deleted the venue',
  'provider.profile_updated': 'Updated your public profile',
  'provider.renamed': 'Changed your provider name',
  'provider.faqs_updated': 'Updated your FAQs',
  'provider.logo_updated': 'Changed your logo',
  'provider.logo_removed': 'Removed your logo',
  'provider.terms_updated': 'Updated your booking terms or cancellation policy',
}

// One line per thing changed in a session (the same change made several times is one line), in the order first done
export async function staffChanges(db: typeof Db, session: string) {
  const rows = await db.execute<{ action: string; name: string | null }>(sql`
    select l.action, coalesce(c.title, cc.title, pl.name, v.name) name, min(l.at) first
    from public.activity_log l
    left join public.courses c on l.target_type = 'course' and c.id::text = l.target_id
    left join public.cohorts co on l.target_type = 'cohort' and co.id::text = l.target_id
    left join public.courses cc on cc.id = co.course_id
    left join public.price_plans pl on l.target_type = 'price_plan' and pl.id::text = l.target_id
    left join public.venues v on l.target_type = 'venue' and v.id::text = l.target_id
    where l.metadata->>'staff' = ${session} and l.action <> 'access.denied'
    group by l.action, 2 order by first`)
  return rows.filter((r) => DONE[r.action]).map((r) => (r.name ? `${DONE[r.action]} “${r.name}”` : DONE[r.action]))
}

// Every admin page (admin.open) closes the sessions anyone left unused for two hours ('idle', logged) and sends the summaries
// still due, so a provider is told even when the admin walked away without pressing End. One quick query when there is
// nothing to do. Never blocks the page.
export async function sweepIdleStaff(ctx: Ctx) {
  try {
    const idle = await ctx.db.execute<{ id: string; admin_user_id: string; organisation_id: string }>(sql`
      update public.staff_access set ended_at = now(), ended_how = 'idle'
      where ended_at is null and last_seen_at < now() - make_interval(secs => ${STAFF_IDLE_MS / 1000})
      returning id, admin_user_id, organisation_id`)
    for (const e of idle) await logActivity(ctx.db, { actorUserId: e.admin_user_id, actorIdentity: 'system', organisationId: e.organisation_id, action: 'admin.staff_access_ended', targetType: 'staff_access', targetId: e.id, metadata: { how: 'idle' }, ip: null })
    const [due] = await ctx.db.execute<{ due: boolean }>(sql`select exists (select 1 from public.staff_access where ended_at is not null and told_at is null) due`)
    if (due?.due) await sendStaffSummaries(ctx, null)
  } catch (error) {
    console.error('staff access: could not close idle sessions', error)
  }
}

// The summaries of ended sessions not sent yet (this admin's, or everyone's with `null`): one email per session to the
// provider's owner with what changed (none when nothing did); each is marked told either way, so it goes once. Never blocks the
// action that called it.
export async function sendStaffSummaries(ctx: Ctx, adminUserId: string | null = ctx.user.id) {
  try {
    const due = await ctx.db.execute<{ id: string; organisation_id: string; reason: string }>(sql`
      update public.staff_access set told_at = now()
      where ${adminUserId ? sql`admin_user_id = ${adminUserId}::uuid and ` : sql``}ended_at is not null and told_at is null
      returning id, organisation_id, reason`)
    for (const s of due) {
      const lines = await staffChanges(ctx.db, s.id)
      if (!lines.length) continue
      const { to, provider } = await ownerOf(ctx.db, s.organisation_id)
      await notify(ctx.db, 'staff-changes', to, { firstName: to?.firstName ?? '', provider, changes: lines.join('\n') }, {
        organisationId: s.organisation_id,
        targetType: 'staff_access',
        targetId: s.id,
        action: 'email.staff_changes_sent',
      })
    }
  } catch (error) {
    console.error('staff access: could not send the summary', error)
  }
}
