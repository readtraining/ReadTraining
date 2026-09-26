import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client (auth admin, storage, etc).
 * Database queries go through Drizzle, not this client.
 */
export const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null
