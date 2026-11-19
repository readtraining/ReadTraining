import { adminUsers, and, eq, organisationMembers, organisations, sql } from '@readtraining/db'
import { adminPermissions, can, type Actor, type Membership } from '@readtraining/permissions'

import { logActivity } from './activity.mjs'
import type { db as Db } from './db.mjs'
import type { VerifiedUser } from './supabase.mjs'

/**
 * The token's session must still exist and the account must not be banned or deleted. A token stays cryptographically valid
 * until it expires (up to an hour), so without this a signed-out, banned or deleted user could keep calling the API.
 */
export async function isSessionLive(db: typeof Db, user: VerifiedUser): Promise<boolean> {
  if (!user.sessionId) return false
  const rows = await db.execute<{ live: boolean }>(sql`
    select exists (
      select 1
      from auth.sessions s
      join auth.users u on u.id = s.user_id
      where s.id = ${user.sessionId}::uuid
        and s.user_id = ${user.id}::uuid
        and (s.not_after is null or s.not_after > now())
        and (u.banned_until is null or u.banned_until <= now())
        and u.deleted_at is null
    ) as live`)
  return rows[0]?.live === true
}

/**
 * Everything the permission check needs to know about the signed-in person, read fresh from the database on each request
 * (memberships and admin switches change, and a token can be up to an hour old).
 */
// Full admins must use two-step sign-in. A test copy can waive that for a client review with ADMIN_TWO_STEP_OPTIONAL=1; it is
// ignored on live (a production deployment: VERCEL_ENV, or NODE_ENV when not on Vercel), so live can never be signed into without it.
const deployment = process.env.VERCEL_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development')
const TWO_STEP_WAIVED = process.env.ADMIN_TWO_STEP_OPTIONAL === '1' && deployment !== 'production'

export async function loadActor(db: typeof Db, user: VerifiedUser): Promise<Actor> {
  const [rows, [admin]] = await Promise.all([
    db
      .select({
        organisationId: organisationMembers.organisationId,
        role: organisationMembers.role,
        status: organisationMembers.status,
        type: organisations.type,
        organisationStatus: organisations.status,
      })
      .from(organisationMembers)
      .innerJoin(organisations, eq(organisations.id, organisationMembers.organisationId))
      .where(eq(organisationMembers.userId, user.id)),
    db
      .select({
        active: adminUsers.active,
        preset: adminUsers.preset,
        permissions: adminUsers.permissions,
        roles: adminUsers.roles,
        refundLimitPence: adminUsers.refundLimitPence,
        isSuper: adminUsers.isSuper,
        twoStep: sql<boolean>`exists (select 1 from auth.mfa_factors f where f.user_id = ${user.id}::uuid and f.status = 'verified')`,
      })
      .from(adminUsers)
      // an invite not yet accepted (no password set) gives no access
      .where(and(eq(adminUsers.userId, user.id), eq(adminUsers.active, true), sql`(${adminUsers.invitedAt} is null or ${adminUsers.acceptedAt} is not null)`)),
  ])
  const actor: Actor = {
    userId: user.id,
    aal: user.aal,
    memberships: rows as Membership[],
    admin: admin ? { ...admin, twoStepWaived: TWO_STEP_WAIVED } : null,
  }
  // an admin working in a provider's workspace as staff: that provider comes first (the workspace opens on it), as one of its
  // admins within their own switches (packages/permissions, `staff`), while they still may (switch, two-step sign-in)
  const staff = actor.admin && can(actor, 'admin.providers.staff') ? await openStaffAccess(db, user.id) : null
  if (staff) {
    const held = adminPermissions(actor.admin)
    actor.memberships = [
      { organisationId: staff.organisationId, type: 'provider', role: 'admin', status: 'active', organisationStatus: staff.organisationStatus, staff: { pricing: held.includes('pricing'), content: held.includes('approve'), session: staff.id } },
      ...actor.memberships.filter((m) => m.organisationId !== staff.organisationId),
    ]
  }
  return actor
}

// How long a staff session lasts unused before it closes by itself
export const STAFF_IDLE_MS = 2 * 60 * 60 * 1000

/**
 * The admin's open staff session (Admin › Providers › Open workspace), or null. One unused for two hours is closed here
 * ('idle'); its summary email goes out the next time the admin opens or ends one (lib/staffAccess.mts). Using it keeps it
 * open (last_seen_at, written at most once a minute).
 */
export async function openStaffAccess(db: typeof Db, adminUserId: string) {
  const [row] = await db.execute<{ id: string; organisation_id: string; organisation_status: Membership['organisationStatus']; type: string; reason: string; started_at: string; idle: boolean; stale: boolean }>(sql`
    select s.id, s.organisation_id, o.status organisation_status, o.type, s.reason, s.started_at,
           s.last_seen_at < now() - make_interval(secs => ${STAFF_IDLE_MS / 1000}) idle,
           s.last_seen_at < now() - interval '1 minute' stale
    from public.staff_access s join public.organisations o on o.id = s.organisation_id
    where s.admin_user_id = ${adminUserId}::uuid and s.ended_at is null`)
  if (!row) return null
  if (row.idle || row.type !== 'provider' || row.organisation_status === 'rejected') {
    const [ended] = await db.execute<{ id: string }>(sql`update public.staff_access set ended_at = now(), ended_how = 'idle' where id = ${row.id}::uuid and ended_at is null returning id`)
    if (ended) await logActivity(db, { actorUserId: adminUserId, actorIdentity: 'system', organisationId: row.organisation_id, action: 'admin.staff_access_ended', targetType: 'staff_access', targetId: row.id, metadata: { how: 'idle' }, ip: null })
    return null
  }
  if (row.stale) await db.execute(sql`update public.staff_access set last_seen_at = now() where id = ${row.id}::uuid`)
  return { id: row.id, organisationId: row.organisation_id, organisationStatus: row.organisation_status, reason: row.reason, startedAt: new Date(row.started_at).toISOString() }
}
