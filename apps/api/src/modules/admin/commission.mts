import { z } from 'zod'

import { platformSettings, sql } from '@readtraining/db'

import { logActivity } from '../../lib/activity.mjs'
import type { db as Db } from '../../lib/db.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// Commission (Part B, B1): the platform's default rate, and (in providers.mts) a provider's own rate. Rates are kept in basis
// points (2500 = 25%) so they are never rounded. Every admin can see them; changing them needs the "fees and commission"
// switch, and each change is logged from → to. A rate applies to bookings made after the change.

// Hurak's marketplace fee, until an admin sets another (the client confirms it)
export const DEFAULT_COMMISSION_BPS = 3000
const KEY = 'commission_default_bps'
export const bps = z.number().int('Enter a rate with up to 2 decimal places.').min(0, 'Enter a rate from 0% to 60%.').max(6000, 'Enter a rate from 0% to 60%.')
export const percent = (b: number | null) => (b === null ? null : b / 100)

export async function defaultCommission(db: typeof Db) {
  const [row] = await db.execute<{ value: number; updated_at: string }>(sql`select value, updated_at from ${platformSettings} where key = ${KEY}`)
  return { bps: row ? Number(row.value) : DEFAULT_COMMISSION_BPS, changedAt: row ? new Date(row.updated_at).toISOString() : null }
}

export const commissionRouter = createTRPCRouter({
  get: adminProcedure('admin.panel.open').query(async ({ ctx }) => {
    const d = await defaultCommission(ctx.db)
    const [o] = await ctx.db.execute<{ n: number }>(sql`select count(*)::int n from public.organisations where type = 'provider' and commission_bps is not null`)
    return { defaultBps: d.bps, changedAt: d.changedAt, ownRates: o.n }
  }),

  setDefault: adminProcedure('admin.finance.settings')
    .input(z.object({ bps }))
    .mutation(async ({ ctx, input }) => {
      const before = await defaultCommission(ctx.db)
      if (before.bps === input.bps) return { bps: input.bps }
      await ctx.db.transaction(async (tx) => {
        await tx
          .insert(platformSettings)
          .values({ key: KEY, value: input.bps, updatedBy: ctx.user.id })
          .onConflictDoUpdate({ target: platformSettings.key, set: { value: input.bps, updatedBy: ctx.user.id, updatedAt: new Date() } })
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.commission_default_changed', targetType: 'setting', targetId: KEY, metadata: { fromPercent: percent(before.bps), toPercent: percent(input.bps) }, ip: ctx.ip })
      })
      return { bps: input.bps }
    }),
})
