import { AsyncLocalStorage } from 'node:async_hooks'

import { activityLog, sql } from '@readtraining/db'
import type { NewActivityLogEntry } from '@readtraining/db'

import type { db as Db } from './db.mjs'

type Writer = Pick<typeof Db, 'insert'>

/**
 * Appends one entry to the activity log. Pass the transaction (`tx`) that makes the change, so the change and its log entry
 * are saved together or not at all. Sign-up, log in, log out, email confirmation and password changes are logged by
 * database triggers on Supabase's auth tables (migration 0004), because they never pass through this API.
 */
export async function logActivity(writer: Writer, entry: NewActivityLogEntry) {
  await writer.insert(activityLog).values(asStaff(entry))
}

/**
 * A request made by an admin working in a provider's workspace as ReadTraining staff (trpc.mts orgProcedure runs it inside
 * this): every entry it writes is the admin's, marked with the staff session (`metadata.staff`), so the log, the provider's
 * history and the summary email tell staff changes from the provider's own.
 */
export const staffScope = new AsyncLocalStorage<{ session: string }>()
function asStaff<T extends { actorIdentity?: unknown; metadata?: unknown }>(entry: T): T {
  const staff = staffScope.getStore()
  if (!staff) return entry
  return { ...entry, actorIdentity: 'admin', metadata: { ...((entry.metadata as object | null) ?? {}), staff: staff.session } }
}

// A refused page or read is logged once per person, page (or procedure) and attempt in this time: a page asks again on every
// render and prefetch, so one person on one page wrote hundreds of identical lines. A refused change is always logged.
const READ_REPEAT_MS = 15 * 60_000

/**
 * For refused requests: logging must never turn a refusal into a different error, so failures are only reported. `read`: the
 * refusal was of a page or a query (nothing would have changed), marked in the entry (`metadata.read`) and not repeated.
 */
export async function logDenied(writer: Writer & Pick<typeof Db, 'execute'>, entry: Omit<NewActivityLogEntry, 'action'> & { attempted: string; read?: boolean }) {
  const { attempted, read, metadata, ...rest } = entry
  try {
    if (read && rest.actorUserId) {
      const [seen] = await writer.execute<{ one: number }>(sql`
        select 1 one from public.activity_log
        where actor_user_id = ${rest.actorUserId}::uuid and at > now() - make_interval(secs => ${READ_REPEAT_MS / 1000})
          and action = 'access.denied' and metadata->>'attempted' = ${attempted} and target_id is not distinct from ${rest.targetId ?? null}
        limit 1`)
      if (seen) return
    }
    await writer.insert(activityLog).values(asStaff({ ...rest, action: 'access.denied', metadata: { ...(metadata as object), attempted, ...(read ? { read: true } : {}) } }))
  } catch (error) {
    console.error('activity_log: could not record access.denied', error)
  }
}
