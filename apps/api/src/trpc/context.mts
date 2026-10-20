import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'

import { isSessionLive, loadActor } from '../lib/actor.mjs'
import { db } from '../lib/db.mjs'
import { verifyAccessToken } from '../lib/supabase.mjs'

/**
 * Runs on every request. `user` is set only for a valid Supabase access token sent as `Authorization: Bearer <token>`;
 * a missing, forged or expired token means a signed-out request. What the user may do is decided by the procedures.
 */
export const createTRPCContext = async ({ req }: CreateExpressContextOptions) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined
  const forwarded = req.headers['x-forwarded-for']
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || req.socket.remoteAddress || null

  const user = await verifyAccessToken(token)
  // Whether the session is still live, and who the person is, asked once per request: a page's batch of calls (often 4 to 10)
  // shares the answer instead of each call repeating the same queries.
  let identity: Promise<{ live: boolean; actor: Awaited<ReturnType<typeof loadActor>> }> | null = null
  const loadIdentity = () => {
    if (!user) throw new Error('loadIdentity needs a signed-in user')
    identity ??= Promise.all([isSessionLive(db, user), loadActor(db, user)]).then(([live, actor]) => ({ live, actor }))
    return identity
  }
  return {
    db,
    user,
    loadIdentity,
    // the verified token, for the few calls the API makes to Supabase Auth on the person's behalf (an email change)
    accessToken: user ? token! : null,
    ip,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
