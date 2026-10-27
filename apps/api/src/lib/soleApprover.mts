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
  const others = await db.execute<{ active: boolean; preset: AdminAccess['preset']; permissions: string[]; refund_limit_pence: number }>(sql`
    select active, preset, permissions, refund_limit_pence from public.admin_users
    where user_id <> ${userId}::uuid and active and (invited_at is null or accepted_at is not null)`)
  return !others.some((a) => adminPermissions({ active: a.active, preset: a.preset, permissions: a.permissions, refundLimitPence: a.refund_limit_pence }).includes('approve'))
}

// the reason a sole approver gives for deciding on their own request
export const OWN_REASON_ERROR = 'Say why you are deciding on your own request (at least 10 characters).'
export const ownReasonOk = (reason: string | undefined) => (reason?.trim().length ?? 0) >= 10
