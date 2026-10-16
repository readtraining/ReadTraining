import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema.js'

export function createDb(url: string) {
  // prepare: false is required for Supabase transaction pooler (port 6543). Idle connections are closed after 20 s and every
  // connection is replaced after 30 min, so a query never lands on a connection the pooler has already dropped.
  const client = postgres(url, { prepare: false, idle_timeout: 20, max_lifetime: 60 * 30, connect_timeout: 10 })
  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof createDb>

export * from './schema.js'
export * from 'drizzle-orm'
