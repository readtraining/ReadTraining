import { sql } from '@readtraining/db'

import { logActivity } from './activity.mjs'
import type { db as Db } from './db.mjs'

const MAX_FAILURES = 5
const WINDOW = '15 minutes'

/**
 * Checks the signed-in person's current password against Supabase's bcrypt hash, in the database (pgcrypto), so no new
 * session is created just to check it. Wrong answers are logged and counted: after 5 in 15 minutes every check is refused
 * until the window passes, which stops guessing from a stolen session.
 */
export async function checkCurrentPassword(
  db: typeof Db,
  userId: string,
  password: string,
  ip: string | null,
): Promise<'ok' | 'wrong' | 'no_password' | 'locked'> {
  const [recent] = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from public.activity_log
    where actor_user_id = ${userId}::uuid and action = 'auth.password_check_failed' and at > now() - ${WINDOW}::interval`)
  if ((recent?.n ?? 0) >= MAX_FAILURES) return 'locked'

  const [row] = await db.execute<{ has_password: boolean; matches: boolean }>(sql`
    select coalesce(encrypted_password, '') <> '' as has_password,
           coalesce(encrypted_password, '') <> '' and encrypted_password = extensions.crypt(${password}, encrypted_password) as matches
    from auth.users where id = ${userId}::uuid`)
  if (!row?.has_password) return 'no_password'
  if (row.matches) return 'ok'
  await logActivity(db, { actorUserId: userId, actorIdentity: 'student', action: 'auth.password_check_failed', targetType: 'user', targetId: userId, ip })
  return 'wrong'
}
