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
  const ip = clientIp(req)

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

// The IP address written to the activity log. A forwarded address is only believed where our own host sets it: on Vercel its edge
// replaces any x-forwarded-for a visitor sends and adds x-vercel-forwarded-for / x-real-ip, so they can't be faked. Anywhere else
// (a local server, another host) a visitor could send any address in those headers, so the connection's own address is used,
// unless TRUST_PROXY=1 says one trusted proxy in front appends to x-forwarded-for: then its last entry (the one that proxy added)
// is used, never the Vercel headers, which a visitor could send through that proxy.
const ON_VERCEL = Boolean(process.env.VERCEL)
const TRUST_PROXY = !ON_VERCEL && process.env.TRUST_PROXY === '1'
const header = (req: CreateExpressContextOptions['req'], name: string, last = false) => {
  const v = req.headers[name]
  const parts = (Array.isArray(v) ? v.join(',') : v)?.split(',').map((x) => x.trim()).filter(Boolean) ?? []
  return (last ? parts[parts.length - 1] : parts[0]) || null
}
export function clientIp(req: CreateExpressContextOptions['req']) {
  const forwarded = ON_VERCEL
    ? header(req, 'x-vercel-forwarded-for') || header(req, 'x-real-ip') || header(req, 'x-forwarded-for')
    : TRUST_PROXY
      ? header(req, 'x-forwarded-for', true)
      : null
  const ip = forwarded || req.socket.remoteAddress || null
  return ip && ip.length <= 64 ? ip : null
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
