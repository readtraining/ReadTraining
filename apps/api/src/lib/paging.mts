import { z } from 'zod'

import { sql, type SQL } from '@readtraining/db'

// Numbered pages for the admin's long lists (orders, learners, providers, the activity log): page 1 is the first, `limit` rows a
// page (25, 50 or 100 on screen), sorted by one of the list's columns either way. Every row carries the total that matches, so
// the screen can say "51 to 100 of 1,240". A tie on the sort column falls back to the row's id, so pages never overlap.
export const paging = {
  page: z.number().int().min(1).max(100000).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  dir: z.enum(['asc', 'desc']).default('desc'),
}
export const total = sql`count(*) over ()::int`
export const orderBy = (column: SQL, dir: 'asc' | 'desc', id: SQL) =>
  dir === 'asc' ? sql`${column} asc nulls last, ${id} asc` : sql`${column} desc nulls last, ${id} desc`
export const window = (page: number, limit: number) => sql`limit ${limit} offset ${(page - 1) * limit}`
