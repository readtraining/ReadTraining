import { sql } from '@readtraining/db'
import { adminPermissions, can } from '@readtraining/permissions'
import type { Actor, AdminAction, AdminAccess } from '@readtraining/permissions'

import type { db as Db } from './db.mjs'

/**
 * The one exception to "nobody decides on their own request", for approvals only (a provider account, a course or a change to
 * one; never money: payouts and refunds always need a second person). A Full admin may decide on a request they made
 * themselves only when no other admin can: no other active admin (invite accepted) has the approve switch. The decision then
 * needs a written reason and is recorded in the activity log as their own request. Once a second admin can approve, the
 * exception switches itself off.
 */
export async function soleApprover(db: typeof Db, actor: Actor, userId: string, action: AdminAction): Promise<boolean> {
  if (actor.admin?.preset !== 'full' || !can(actor, action)) return false
  // the other admins who could approve: active, invite accepted, and their login neither blocked nor deleted (as the admins
  // emailed about waiting approvals, lib/notify.mts)
  const others = await db.execute<{ active: boolean; preset: AdminAccess['preset']; permissions: string[]; refund_limit_pence: number }>(sql`
    select a.active, a.preset, a.permissions, a.refund_limit_pence from public.admin_users a join auth.users u on u.id = a.user_id
    where a.user_id <> ${userId}::uuid and a.active and (a.invited_at is null or a.accepted_at is not null)
      and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now())`)
  return !others.some((a) => adminPermissions({ active: a.active, preset: a.preset, permissions: a.permissions, refundLimitPence: a.refund_limit_pence }).includes('approve'))
}

// Why an admin can't decide on their own request: a Full admin who could a moment ago has lost the exception because another
// admin can approve now; anyone else never had it.
export const ownRequestRefused = (actor: Actor) =>
  actor.admin?.preset === 'full' ? 'You sent this yourself, and another admin can now approve it, so ask them to decide on it.' : 'You sent this yourself, so another admin must decide on it.'

// the reason a sole approver gives for deciding on their own request
export const OWN_REASON_ERROR = 'Say why you are deciding on your own request (at least 10 characters).'
export const ownReasonOk = (reason: string | undefined) => (reason?.trim().length ?? 0) >= 10
