// Demo accounts for a DEVELOPMENT or test database, so someone trying the site (the client) can sign in as each kind of user:
// three admins below the super admin (Support, Finance and a custom one), eight learners, three providers (approved, waiting
// for approval, rejected) and a business, each with its owner. Every address is @example.com, so no real email is ever sent.
// The passwords are made here and written to demo-accounts.local.md at the repo root (not committed). Run it once on an empty
// database; it stops if the demo accounts are already there. Never part of the migrations and refuses to run on the live project.
//
//   pnpm --filter @readtraining/api seed:demo
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { adminUsers, organisationMembers, organisations, sql } from '@readtraining/db'

import { db } from '../lib/db.mjs'

if (/LIVE_|readtraining-live/.test(process.env.DATABASE_URL ?? '') || process.env.VERCEL_ENV === 'production') {
  console.error('seed:demo is for development and test databases only.')
  process.exit(1)
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed in .env.')
  process.exit(1)
}
const [already] = await db.execute(sql`select 1 from auth.users where email = 'support.admin@example.com'`)
if (already) {
  console.log('The demo accounts are already there.')
  process.exit(0)
}

// a password that meets the sign-up rules (8 or more, a letter and a number)
const password = () => `Demo-${randomBytes(6).toString('base64url')}7`
const made: { who: string; email: string; password: string }[] = []

async function account(first: string, last: string, email: string, who: string) {
  const pw = password()
  const res = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pw, email_confirm: true, user_metadata: { first_name: first, last_name: last } }),
  })
  const body = (await res.json()) as { id?: string; msg?: string; message?: string }
  if (!res.ok || !body.id) throw new Error(`${email}: ${body.msg || body.message || res.status}`)
  made.push({ who, email, password: pw })
  return body.id
}
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// admins below the super admin (the super admin is granted separately: pnpm admin:grant <email> --super)
const ADMINS = [
  { first: 'Sara', last: 'Mitchell', email: 'support.admin@example.com', preset: 'support', permissions: [] as string[], who: 'Admin, Support' },
  { first: 'Tom', last: 'Bennett', email: 'finance.admin@example.com', preset: 'finance', permissions: [], who: 'Admin, Finance' },
  { first: 'Nadia', last: 'Hussain', email: 'content.admin@example.com', preset: 'custom', permissions: ['content', 'catalogue', 'approve'], who: 'Admin, custom (content, catalogue, approvals)' },
] as const
for (const a of ADMINS) {
  const id = await account(a.first, a.last, a.email, a.who)
  await db.insert(adminUsers).values({ userId: id, preset: a.preset, permissions: [...a.permissions] })
}

const LEARNERS = [
  ['Sophie', 'Turner'], ['Chloe', 'Evans'], ['Aisha', 'Begum'], ['Amelia', 'Clarke'],
  ['Daniel', 'Okafor'], ['Liam', 'Hughes'], ['Emily', 'Ward'], ['Ryan', 'Patel'],
] as const
for (const [first, last] of LEARNERS) await account(first, last, `${first.toLowerCase()}.${last.toLowerCase()}@example.com`, 'Learner')

// providers in each state an admin works with, and a business
const ORGS = [
  { type: 'provider', name: 'Northgate Training', status: 'active', note: null, owner: ['Oliver', 'Grant'], email: 'owner@northgate-training.example.com', who: 'Provider owner (approved)' },
  { type: 'provider', name: 'Brightpath Safety', status: 'pending', note: null, owner: ['Hannah', 'Lewis'], email: 'owner@brightpath-safety.example.com', who: 'Provider owner (waiting for approval)' },
  { type: 'provider', name: 'Quickcert Courses', status: 'rejected', note: 'We could not confirm your accreditation. Please add your awarding body approval number and apply again.', owner: ['Mark', 'Foster'], email: 'owner@quickcert.example.com', who: 'Provider owner (rejected)' },
  { type: 'business', name: 'Brightwell Facilities Ltd', status: 'active', note: null, owner: ['Priya', 'Shah'], email: 'priya.shah@brightwell.example.com', who: 'Business account owner' },
] as const
for (const o of ORGS) {
  const id = await account(o.owner[0], o.owner[1], o.email, o.who)
  const [org] = await db
    .insert(organisations)
    .values({ type: o.type, name: o.name, slug: slug(o.name), status: o.status, statusNote: o.note, statusChangedAt: o.status === 'pending' ? null : new Date(), termsAcceptedAt: new Date(), termsVersion: '2026-10', createdBy: id })
    .returning({ id: organisations.id })
  await db.insert(organisationMembers).values({ organisationId: org.id, userId: id, role: 'owner', jobTitle: o.type === 'business' ? 'Operations Manager' : null })
}

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
const file = join(root, 'demo-accounts.local.md')
writeFileSync(
  file,
  `# Demo accounts (development database)\n\nMade by seed:demo on ${new Date().toISOString().slice(0, 10)}. Every address is @example.com, so no email reaches anyone. Not committed.\nAdmins sign in at /admin/login, everyone else at /login.\n\n| Who | Email | Password |\n| --- | --- | --- |\n${made.map((m) => `| ${m.who} | ${m.email} | ${m.password} |`).join('\n')}\n`,
)
console.log(`${made.length} demo accounts made. Their passwords are in demo-accounts.local.md`)
process.exit(0)
