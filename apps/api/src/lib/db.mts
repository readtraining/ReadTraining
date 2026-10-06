import { createDb } from '@readtraining/db'

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL is not set, database queries will fail')
}

export const db = createDb(process.env.DATABASE_URL ?? 'postgres://localhost:5432/postgres')
