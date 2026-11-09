import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limits, counted in Upstash Redis (the Vercel integration's KV_REST_API_URL / KV_REST_API_TOKEN) so a limit holds across
// every copy of the API Vercel runs. Where those aren't set (a development copy without them) each copy counts in its own
// memory, so the limits still apply there. Keys are kept apart per deployment (production, preview, development).
//
// The Vercel Firewall already caps each IP at 300 API requests a minute before anything reaches us; these are the precise
// limits behind it: the same cap in the code (`api`, in case the firewall rule is changed) and tighter ones on actions that
// send emails, create records or hand out upload links.
type Window = `${number} ${'s' | 'm' | 'h' | 'd'}`
export const LIMITS = {
  api: { requests: 300, window: '1 m', message: 'Too many requests. Please wait a minute and try again.' },
  publicForm: { requests: 5, window: '10 m', message: 'Too many messages from this connection. Please wait a few minutes and try again.' },
  providerApply: { requests: 5, window: '1 h', message: 'Too many applications in a short time. Please wait and try again later.' },
  businessCreate: { requests: 5, window: '1 h', message: 'Too many business accounts in a short time. Please wait and try again later.' },
  adminInvite: { requests: 20, window: '1 h', message: 'Too many invites in a short time. Please wait and try again later.' },
  uploadHour: { requests: 30, window: '1 h', message: 'Too many uploads in a short time. Please wait a little and try again.' },
  uploadDay: { requests: 100, window: '1 d', message: 'You have reached today’s upload limit. Please try again tomorrow.' },
  closure: { requests: 5, window: '1 h', message: 'Too many requests in a short time. Please wait and try again later.' },
  setPassword: { requests: 5, window: '1 h', message: 'Too many tries in a short time. Please wait and try again later.' },
} as const satisfies Record<string, { requests: number; window: Window; message: string }>
export type LimitName = keyof typeof LIMITS

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const redis = url && token ? new Redis({ url, token }) : null
const deployment = process.env.VERCEL_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development')

const MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }
const windowMs = (w: Window) => {
  const [n, unit] = w.split(' ') as [string, keyof typeof MS]
  return Number(n) * MS[unit]
}

// Upstash: one sliding-window limiter per rule, made on first use. ephemeralCache remembers callers already over the limit, so
// they cost no Redis call until their window ends.
const limiters = new Map<LimitName, Ratelimit>()
const upstash = (name: LimitName) => {
  let l = limiters.get(name)
  if (!l) {
    const { requests, window } = LIMITS[name]
    l = new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(requests, window), prefix: `rt:${deployment}:${name}`, ephemeralCache: new Map(), analytics: false })
    limiters.set(name, l)
  }
  return l
}

// Without Upstash: a fixed window per key, in this copy's memory (old windows are dropped as they are passed)
const memory = new Map<string, { count: number; ends: number }>()
const inMemory = (name: LimitName, key: string) => {
  const now = Date.now()
  const id = `${name}:${key}`
  const w = memory.get(id)
  if (!w || w.ends <= now) {
    if (memory.size > 50_000) for (const [k, v] of memory) if (v.ends <= now) memory.delete(k)
    memory.set(id, { count: 1, ends: now + windowMs(LIMITS[name].window) })
    return true
  }
  w.count += 1
  return w.count <= LIMITS[name].requests
}

/** True when `key` (an IP address or a user id) may go ahead under `name`. Never throws: if Upstash can't be reached (down, or a
 *  wrong or rotated token) this copy's memory counts instead, so the limits still hold per server copy and nobody is locked out.
 *  The error is logged each time, so a broken token shows in the logs. */
export async function allowed(name: LimitName, key: string | null | undefined): Promise<boolean> {
  const k = key || 'unknown'
  if (!redis) return inMemory(name, k)
  try {
    return (await upstash(name).limit(k)).success
  } catch (e) {
    console.error(`rate limit ${name}: counter unavailable, counting in memory (${e instanceof Error ? e.message.split('\n')[0] : 'error'})`)
    return inMemory(name, k)
  }
}
