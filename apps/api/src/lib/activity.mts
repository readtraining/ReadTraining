import { activityLog } from '@readtraining/db'
import type { NewActivityLogEntry } from '@readtraining/db'

import type { db as Db } from './db.mjs'

type Writer = Pick<typeof Db, 'insert'>

/**
 * Appends one entry to the activity log. Pass the transaction (`tx`) that makes the change, so the change and its log entry
 * are saved together or not at all. Sign-up, log in, log out, email confirmation and password changes are logged by
 * database triggers on Supabase's auth tables (migration 0004), because they never pass through this API.
 */
export async function logActivity(writer: Writer, entry: NewActivityLogEntry) {
  await writer.insert(activityLog).values(entry)
}

/** For refused requests: logging must never turn a refusal into a different error, so failures are only reported. */
export async function logDenied(writer: Writer, entry: Omit<NewActivityLogEntry, 'action'> & { attempted: string }) {
  const { attempted, metadata, ...rest } = entry
  try {
    await writer.insert(activityLog).values({ ...rest, action: 'access.denied', metadata: { ...(metadata as object), attempted } })
  } catch (error) {
    console.error('activity_log: could not record access.denied', error)
  }
}
