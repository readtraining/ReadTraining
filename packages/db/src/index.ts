import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema.js'

export function createDb(url: string) {
  // prepare: false is required for Supabase transaction pooler (port 6543). Idle connections are closed after 20 s and every
  // connection is replaced after 30 min, so a query never lands on a connection the pooler has already dropped.
  // max_pipeline: 0 sends one query per connection at a time. With more queries than connections, postgres.js would otherwise
  // send several down one connection without waiting, and the transaction pooler then hangs or hands one query another's rows
  // (supabase/supavisor#1239). Transactions still reserve their connection thanks to patches/postgres@3.4.9.patch
  // (porsager/postgres#1211); drop both once either fix is released. Not in the postgres.js types, hence the separate object.
  const options = { prepare: false, idle_timeout: 20, max_lifetime: 60 * 30, connect_timeout: 10, max_pipeline: 0 }
  const client = postgres(url, options)
  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof createDb>

export * from './schema.js'
export * from 'drizzle-orm'
