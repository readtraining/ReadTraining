import * as trpcExpress from '@trpc/server/adapters/express'
import cors from 'cors'
import express from 'express'

import { createTRPCContext } from './trpc/context.mjs'
import { appRouter } from './trpc/router.mjs'

const PORT = process.env.PORT || 4000
const WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:3000'

const app = express()

// The web app sends a Bearer token, not cookies, so no credentialed CORS is needed (in production it's the same domain anyway).
app.use(cors({ origin: WEB_ORIGIN }))

// Mounted under /api because Vercel Services passes the full /api/... path through to this service.
app.use(
  '/api/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: createTRPCContext,
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
