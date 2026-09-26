import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '../../.env' })

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Direct/session connection (port 5432) for migrations
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
})
