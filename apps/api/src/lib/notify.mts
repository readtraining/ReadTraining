import { sql } from '@readtraining/db'
import type { NewActivityLogEntry } from '@readtraining/db'
import { adminPermissions } from '@readtraining/permissions'

import { renderEmail, wordsFor } from '../emails/templates.mjs'
import { logActivity } from './activity.mjs'
import type { db as Db } from './db.mjs'
import { sendEmail } from './email.mjs'
import { siteUrl } from './supabase.mjs'

// The emails that tell people something happened: a provider's application or course is waiting, a business account is ready,
// an admin's access changed. They are sent after the change is saved and never undo or hold it up: a failure is only reported,
// and the caller gets false. Each email sent is written to the activity log (who it went to stays out of the log).

type Log = Pick<NewActivityLogEntry, 'organisationId' | 'targetType' | 'targetId'> & { action: string }
type Person = { email: string; firstName: string }

async function deliver(db: typeof Db, key: string, vars: Record<string, string>, to: Person) {
  try {
    return await sendEmail(renderEmail(key, await wordsFor(db, key), { ...vars, firstName: to.firstName }, siteUrl, to.email))
  } catch (error) {
    console.error(`email ${key}: could not send`, error instanceof Error ? error.message : error)
    return false
  }
}

async function record(db: typeof Db, log: Log, metadata: Record<string, unknown>) {
  try {
    await logActivity(db, { actorUserId: null, actorIdentity: 'system', organisationId: log.organisationId ?? null, action: log.action, targetType: log.targetType, targetId: log.targetId, metadata, ip: null })
  } catch (error) {
    console.error(`activity_log: could not record ${log.action}`, error)
  }
}

// one person's email address and first name (and, for the admins' emails, "Name (email)"), or null when they have no account
export async function personOf(db: typeof Db, userId: string): Promise<(Person & { label: string }) | null> {
  const [p] = await db.execute<{ email: string | null; first_name: string | null; last_name: string | null }>(sql`
    select u.email, p.first_name, p.last_name from auth.users u left join public.profiles p on p.id = u.id where u.id = ${userId}::uuid`)
  if (!p?.email) return null
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
  return { email: p.email, firstName: p.first_name ?? '', label: name ? `${name} (${p.email})` : p.email }
}

// a provider's owner and the provider's name, for emails about its account and courses
export async function ownerOf(db: typeof Db, organisationId: string): Promise<{ to: Person | null; provider: string }> {
  const [o] = await db.execute<{ name: string; email: string | null; first_name: string | null }>(sql`
    select o.name, u.email, p.first_name from public.organisations o
    left join public.organisation_members m on m.organisation_id = o.id and m.role = 'owner'
    left join auth.users u on u.id = m.user_id left join public.profiles p on p.id = m.user_id
    where o.id = ${organisationId}::uuid limit 1`)
  return { to: o?.email ? { email: o.email, firstName: o.first_name ?? '' } : null, provider: o?.name ?? '' }
}

// One email to one person.
export async function notify(db: typeof Db, key: string, to: Person | null, vars: Record<string, string>, log: Log) {
  if (!to) return false
  const sent = await deliver(db, key, vars, to)
  if (sent) await record(db, log, { email: key })
  return sent
}

// The admins who decide on providers and courses: active, invite accepted, holding the "approve" switch. The person whose
// request it is isn't told about their own (an admin who is also a provider's owner, say).
async function approvers(db: typeof Db, except: string | null): Promise<Person[]> {
  const rows = await db.execute<{ user_id: string; email: string; first_name: string | null; preset: 'full' | 'support' | 'finance' | 'custom'; permissions: string[]; refund_limit_pence: number }>(sql`
    select a.user_id, u.email, p.first_name, a.preset, a.permissions, a.refund_limit_pence
    from public.admin_users a join auth.users u on u.id = a.user_id left join public.profiles p on p.id = a.user_id
    where a.active and not (a.invited_at is not null and a.accepted_at is null) and u.deleted_at is null and u.email is not null`)
  return rows
    .filter((r) => r.user_id !== except && adminPermissions({ active: true, preset: r.preset, permissions: r.permissions, refundLimitPence: r.refund_limit_pence }).includes('approve'))
    .map((r) => ({ email: r.email, firstName: r.first_name ?? '' }))
}

// One email to each admin who can approve. Returns how many were sent.
export async function notifyApprovers(db: typeof Db, key: string, vars: Record<string, string>, log: Log, except: string | null) {
  let team: Person[]
  try {
    team = await approvers(db, except)
  } catch (error) {
    console.error(`email ${key}: could not find the admins to tell`, error instanceof Error ? error.message : error)
    return 0
  }
  const sent = (await Promise.all(team.map((to) => deliver(db, key, vars, to)))).filter(Boolean).length
  if (sent) await record(db, log, { email: key, sent, of: team.length })
  return sent
}
