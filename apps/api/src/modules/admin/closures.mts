import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { sql } from '@readtraining/db'

import { logActivity } from '../../lib/activity.mjs'
import { notify } from '../../lib/notify.mjs'
import { AVATARS, supabase } from '../../lib/supabase.mjs'
import { adminProcedure, createTRPCRouter } from '../../trpc/trpc.mjs'

// Account closure requests (UK GDPR: a person's request to delete their data is carried out within one month). A learner asks in
// Account settings (me.requestClosure); admins with the "suspend" switch see every request here, nearest deadline first, and close
// the account. Closing deletes the login, which takes the profile (name, phone, photo, address), memberships and admin row with it
// (their foreign keys cascade); orders, bookings and the money records stay, as the law asks, with the login link set to null.
// The request row has no foreign key, so it stays as the record that the request was carried out.

const STATUS = ['open', 'done', 'withdrawn'] as const
const iso = (t: string | null) => (t ? new Date(t).toISOString() : null)

export const closuresRouter = createTRPCRouter({
  // The admin menu's count: requests still open.
  counts: adminProcedure('admin.accounts.suspend').query(async ({ ctx }) => {
    const [r] = await ctx.db.execute<{ open: number }>(sql`select count(*)::int open from public.account_closure_requests where status = 'open'`)
    return { open: r?.open ?? 0 }
  }),

  // One tab of requests: open ones by deadline (oldest first), the others newest first. The person's current name comes from
  // their profile while the account exists; a closed account shows the email they asked from.
  list: adminProcedure('admin.accounts.suspend')
    .input(z.object({ status: z.enum(STATUS).default('open') }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute<{
        id: string
        user_id: string
        email: string
        reason: string | null
        status: (typeof STATUS)[number]
        requested_at: string
        due_at: string
        closed_at: string | null
        exists: boolean
        first_name: string | null
        last_name: string | null
        closed_by: string | null
      }>(sql`
        select r.id, r.user_id, r.email, r.reason, r.status, r.requested_at, r.requested_at + interval '1 month' due_at, r.closed_at,
               (u.id is not null and u.deleted_at is null) "exists", p.first_name, p.last_name,
               nullif(trim(concat_ws(' ', bp.first_name, bp.last_name)), '') closed_by
        from public.account_closure_requests r
        left join auth.users u on u.id = r.user_id
        left join public.profiles p on p.id = r.user_id
        left join public.profiles bp on bp.id = r.closed_by
        where r.status = ${input.status}
        order by ${input.status === 'open' ? sql`r.requested_at asc` : sql`coalesce(r.closed_at, r.requested_at) desc`}
        limit 200`)
      const [counts] = await ctx.db.execute<Record<(typeof STATUS)[number], number>>(sql`
        select count(*) filter (where status = 'open')::int open, count(*) filter (where status = 'done')::int done,
               count(*) filter (where status = 'withdrawn')::int withdrawn
        from public.account_closure_requests`)
      return {
        counts,
        requests: rows.map((r) => ({
          id: r.id,
          userId: r.user_id,
          name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || null,
          email: r.email,
          reason: r.reason,
          status: r.status,
          requestedAt: iso(r.requested_at)!,
          dueAt: iso(r.due_at)!,
          closedAt: iso(r.closed_at),
          closedBy: r.closed_by,
          accountExists: r.exists,
        })),
      }
    }),

  // Close the account a request is about. Refused for an admin (remove them from the admin team first) and for the owner of a
  // provider or business account (that account would be left without an owner). The request row is locked first, so two admins
  // pressing at once close it once and the second is told it is done. The login is deleted in the same transaction as the request
  // is marked done, so neither happens without the other. Their photo file and the "closed" email follow the commit.
  close: adminProcedure('admin.accounts.suspend')
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const done = await ctx.db.transaction(async (tx) => {
        const [req] = await tx.execute<{ user_id: string; email: string; status: string }>(sql`
          select user_id, email, status from public.account_closure_requests where id = ${input.id}::uuid for update`)
        if (!req) throw new TRPCError({ code: 'NOT_FOUND', message: 'This request no longer exists.' })
        if (req.status === 'done') throw new TRPCError({ code: 'CONFLICT', message: 'This account has already been closed.' })
        if (req.status === 'withdrawn') throw new TRPCError({ code: 'CONFLICT', message: 'They withdrew this request, so the account stays open.' })
        if (req.user_id === ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can’t close your own account here.' })

        const [who] = await tx.execute<{ first_name: string | null; avatar_url: string | null; admin: boolean }>(sql`
          select p.first_name, p.avatar_url, exists (select 1 from public.admin_users a where a.user_id = u.id and a.active) admin
          from auth.users u left join public.profiles p on p.id = u.id where u.id = ${req.user_id}::uuid`)
        if (who?.admin) throw new TRPCError({ code: 'FORBIDDEN', message: 'This person is on the admin team. Remove them from the admin team first.' })
        const owns = await tx.execute<{ name: string; type: 'provider' | 'business' }>(sql`
          select o.name, o.type from public.organisation_members m join public.organisations o on o.id = m.organisation_id
          where m.user_id = ${req.user_id}::uuid and m.role = 'owner' order by o.name`)
        if (owns.length) {
          const list = owns.map((o) => `${o.name} (${o.type === 'provider' ? 'provider' : 'business'} account)`).join(', ')
          throw new TRPCError({ code: 'CONFLICT', message: `They own ${list}. That account needs another owner, or to be closed, before theirs can be.` })
        }

        // the login goes (its profile, memberships and sessions with it); a login already gone just marks the request done
        if (who) await tx.execute(sql`delete from auth.users where id = ${req.user_id}::uuid`)
        // the reason is theirs and no longer needed; the email stays as the record of whom the request was for
        await tx.execute(sql`
          update public.account_closure_requests set status = 'done', closed_at = now(), closed_by = ${ctx.user.id}::uuid, reason = null
          where id = ${input.id}::uuid`)
        await logActivity(tx, { actorUserId: ctx.user.id, actorIdentity: 'admin', action: 'admin.account_closed', targetType: 'account', targetId: req.user_id, metadata: { requestId: input.id, alreadyGone: !who }, ip: ctx.ip })
        return { userId: req.user_id, email: req.email, firstName: who?.first_name ?? '', photo: who?.avatar_url ?? null }
      })

      // after the commit: their stored photo (not a Google or Facebook picture address) and the "it's done" email
      if (done.photo && !/^https:\/\//.test(done.photo) && supabase) {
        const { error } = await supabase.storage.from(AVATARS).remove([done.photo])
        if (error) console.error('account closure: the photo file could not be removed:', error.message)
      }
      await notify(ctx.db, 'closure-done', { email: done.email, firstName: done.firstName }, {}, { targetType: 'account', targetId: done.userId, action: 'email.closure_done_sent' })
      return { ok: true }
    }),
})
