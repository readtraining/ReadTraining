import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'

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

  return {
    db,
    user: await verifyAccessToken(token),
    ip,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
