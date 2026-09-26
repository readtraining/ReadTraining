import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema.js'

export function createDb(url: string) {
  // prepare: false is required for Supabase transaction pooler (port 6543)
  const client = postgres(url, { prepare: false })
  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof createDb>

export * from './schema.js'
export * from 'drizzle-orm'
