import * as trpcExpress from '@trpc/server/adapters/express'
import cors from 'cors'
import express from 'express'

import { createTRPCContext } from './trpc/context.js'
import { appRouter } from './trpc/router.js'

const PORT = process.env.PORT || 4000
const WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:3000'

const app = express()

app.use(cors({ origin: WEB_ORIGIN, credentials: true }))

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error, path }) {
      console.error(`tRPC error on ${path}:`, error)
    },
  }),
)

app.listen(PORT, () => {
  console.log(`🚀 tRPC endpoint ready at http://localhost:${PORT}/trpc`)
})
