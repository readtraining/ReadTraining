import { sql } from '@readtraining/db'

import type { db as Db } from './db.mjs'

// What has to happen before a person's account can be closed: they are on the admin team (another admin removes them), or they
// own a provider or business account that would be left without an owner (a business with nobody else on it they can delete
// themselves in Account settings; anything else goes through our team). A rejected provider application holds nothing, so it
// doesn't count. Account settings shows these with what to do (me.get), a request is refused while any is left
// (me.requestClosure), and an admin's Close account checks them again (admin.closures.close).
export type ClosureBlocker = { kind: 'admin' } | { kind: 'business' | 'provider'; name: string; others: number }

type Reader = Pick<typeof Db, 'execute'>

export async function closureBlockers(db: Reader, userId: string): Promise<ClosureBlocker[]> {
  const [admin] = await db.execute<{ yes: boolean }>(sql`select exists (select 1 from public.admin_users where user_id = ${userId}::uuid and active) yes`)
  const owned = await db.execute<{ name: string; type: 'business' | 'provider'; others: number }>(sql`
    select o.name, o.type,
           (select count(*)::int from public.organisation_members x where x.organisation_id = o.id and x.user_id <> ${userId}::uuid) others
    from public.organisation_members m join public.organisations o on o.id = m.organisation_id
    where m.user_id = ${userId}::uuid and m.role = 'owner' and o.status <> 'rejected'
    order by o.type, o.name`)
  return [...(admin?.yes ? [{ kind: 'admin' as const }] : []), ...owned.map((o) => ({ kind: o.type, name: o.name, others: o.others }))]
}
