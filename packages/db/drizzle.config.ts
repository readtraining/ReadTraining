import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '../../.env' })

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  // Supabase owns the anon/authenticated/service_role roles: policies may use them, migrations must never create or drop them
  entities: { roles: { provider: 'supabase' } },
  dbCredentials: {
    // Direct/session connection (port 5432) for migrations
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
})
