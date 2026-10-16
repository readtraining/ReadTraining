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
    onError({ error, path }) {
      console.error(`tRPC error on ${path}:`, error)
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
