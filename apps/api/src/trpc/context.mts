import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'

import { db } from '../lib/db.mjs'

/**
 * Runs on every request. Put db, session, services, etc. here.
 */
export const createTRPCContext = async ({ req }: CreateExpressContextOptions) => {
  // Demo auth: send `Authorization: Bearer <userId>` to be "logged in"
  const userId = req.headers.authorization?.split(' ')[1]

  return {
    db,
    user: userId ? { id: userId } : null,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
