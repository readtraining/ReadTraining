import type { IncomingMessage } from 'node:http'

// The visitor's IP address. On Vercel, x-forwarded-for is set by Vercel's edge to the real client address (a value the client
// sends is replaced, so it can't be faked there); elsewhere it falls back to the connection's own address.
export function clientIp(req: IncomingMessage): string | null {
  const forwarded = req.headers['x-forwarded-for']
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || req.socket.remoteAddress || null
}
