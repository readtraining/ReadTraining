import { adminUsers, and, eq, organisationMembers, organisations, sql } from '@readtraining/db'
import type { Actor, Membership } from '@readtraining/permissions'

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
        refundLimitPence: adminUsers.refundLimitPence,
        isSuper: adminUsers.isSuper,
        twoStep: sql<boolean>`exists (select 1 from auth.mfa_factors f where f.user_id = ${user.id}::uuid and f.status = 'verified')`,
      })
      .from(adminUsers)
      // an invite not yet accepted (no password set) gives no access
      .where(and(eq(adminUsers.userId, user.id), eq(adminUsers.active, true), sql`(${adminUsers.invitedAt} is null or ${adminUsers.acceptedAt} is not null)`)),
  ])
  return {
    userId: user.id,
    aal: user.aal,
    memberships: rows as Membership[],
    admin: admin ?? null,
  }
}
