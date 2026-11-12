import * as trpcExpress from '@trpc/server/adapters/express'
import cors from 'cors'
import express from 'express'

import { clientIp } from './lib/clientIp.mjs'
import { allowed, LIMITS } from './lib/rateLimit.mjs'
import { createTRPCContext } from './trpc/context.mjs'
import { appRouter } from './trpc/router.mjs'

const PORT = process.env.PORT || 4000
const WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:3000'

const app = express()

// A database error that arrives outside any request (a dropped or reset connection) is logged; it must never stop the API.
process.on('unhandledRejection', (reason) => {
  const r = reason as Error & { code?: string }
  console.error(`Unhandled: ${r?.code ?? r?.name ?? 'error'}: ${String(r?.message ?? reason).split('\n')[0]}`)
})

// The web app sends a Bearer token, not cookies, so no credentialed CORS is needed (in production it's the same domain anyway).
app.use(cors({ origin: WEB_ORIGIN }))

// The same security headers as the website's pages (apps/web/next.config.ts), for the API's answers: they are data, never a page,
// so nothing may run or be framed from them. Express's own "X-Powered-By" is dropped (it only tells attackers what we run).
app.disable('x-powered-by')
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
  res.setHeader('Strict-Transport-Security', 'max-age=31536000')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
})

// A request body over 100 KB is refused straight away (413), before anything else runs: no form or editor sends that much
// (pictures go straight to storage). tRPC's own maxBodySize below catches a body that doesn't say its size up front.
const MAX_BODY = 100 * 1024
app.use('/api/trpc', (req, res, next) => {
  if (Number(req.headers['content-length'] || 0) <= MAX_BODY) return next()
  res.status(413).json({ error: { json: { message: 'This request is too large.', code: -32013, data: { code: 'PAYLOAD_TOO_LARGE', httpStatus: 413 } } } })
})

// Each visitor (IP) may make 300 API calls a minute (the Vercel Firewall caps 300 requests in front of us; this holds if that
// rule is ever changed). The website sends several calls in one request (tRPC batching: /api/trpc/a,b,c), so each call in it
// counts, and a request may hold at most MAX_BATCH calls (the website's own batches are capped at the same number). Over it:
// 429 in tRPC's own error shape, so the website shows the message.
const MAX_BATCH = 20
const callsIn = (path: string) => Math.max(1, path.replace(/^\/+/, '').split(',').length)
app.use('/api/trpc', async (req, res, next) => {
  const calls = callsIn(req.path)
  if (calls > MAX_BATCH) {
    res.status(400).json({ error: { json: { message: 'Too many calls in one request.', code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400 } } } })
    return
  }
  if (await allowed('api', clientIp(req), calls)) return next()
  res.status(429).json({ error: { json: { message: LIMITS.api.message, code: -32029, data: { code: 'TOO_MANY_REQUESTS', httpStatus: 429 } } } })
})

// Mounted under /api because Vercel Services passes the full /api/... path through to this service.
app.use(
  '/api/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: createTRPCContext,
    maxBodySize: MAX_BODY,
    maxBatchSize: MAX_BATCH,
    // One short line per error: never the input (it can hold passwords) and never the whole error object.
    onError({ error, path }) {
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        // the deepest cause (for a failed query: the database's own code and message, not the query or its values)
        let root: unknown = error
        while (root instanceof Error && root.cause instanceof Error) root = root.cause
        const r = root as Error & { code?: string }
        console.error(`tRPC ${path}: ${error.code} ← ${r.code ?? r.name}: ${r.message.split('\n')[0]}`)
      }
      else console.warn(`tRPC ${path}: ${error.code}`)
    },
  }),
)

// On Vercel the exported app runs as a function; listen only when running locally.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 tRPC endpoint ready at http://localhost:${PORT}/api/trpc`)
  })
}

export default app
