import type { IncomingMessage } from 'node:http'

// The visitor's IP address (the activity log, the rate limits). A forwarded address is only believed where our own host sets it:
// on Vercel its edge replaces any x-forwarded-for a visitor sends and adds x-vercel-forwarded-for / x-real-ip, so they can't be
// faked. Anywhere else (a local server, another host) a visitor could send any address in those headers, so the connection's own
// address is used, unless TRUST_PROXY=1 says one trusted proxy in front appends to x-forwarded-for: then its last entry (the one
// that proxy added) is used, never the Vercel headers, which a visitor could send through that proxy.
const ON_VERCEL = Boolean(process.env.VERCEL)
const TRUST_PROXY = !ON_VERCEL && process.env.TRUST_PROXY === '1'

const header = (req: IncomingMessage, name: string, last = false) => {
  const v = req.headers[name]
  const parts = (Array.isArray(v) ? v.join(',') : v)?.split(',').map((x) => x.trim()).filter(Boolean) ?? []
  return (last ? parts[parts.length - 1] : parts[0]) || null
}

export function clientIp(req: IncomingMessage): string | null {
  const forwarded = ON_VERCEL
    ? header(req, 'x-vercel-forwarded-for') || header(req, 'x-real-ip') || header(req, 'x-forwarded-for')
    : TRUST_PROXY
      ? header(req, 'x-forwarded-for', true)
      : null
  const ip = forwarded || req.socket.remoteAddress || null
  return ip && ip.length <= 64 ? ip : null
}
