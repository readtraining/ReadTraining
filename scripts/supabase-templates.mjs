// Puts ReadTraining's email templates (supabase/templates/*.html) and subject lines into a Supabase project, and sets the sender
// name, through the Supabase Management API. Uses SUPABASE_ACCESS_TOKEN from the root .env (a personal access token from
// supabase.com/dashboard/account/tokens; never committed).
//
//   pnpm supabase:templates          the development / test project (NEXT_PUBLIC_SUPABASE_URL)
//   pnpm supabase:templates --live   the live project (LIVE_SUPABASE_URL)
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^"|"$/g, '')]),
)
const live = process.argv.includes('--live')
const url = live ? env.LIVE_SUPABASE_URL : env.NEXT_PUBLIC_SUPABASE_URL
if (!env.SUPABASE_ACCESS_TOKEN) throw new Error('Add SUPABASE_ACCESS_TOKEN to the root .env first.')
if (!url) throw new Error(`Add ${live ? 'LIVE_SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_URL'} to the root .env first.`)
const ref = new URL(url).host.split('.')[0]
const file = (name) => readFileSync(join(root, 'supabase', 'templates', name), 'utf8')

const settings = {
  smtp_sender_name: 'ReadTraining',
  mailer_subjects_confirmation: 'Confirm your email address',
  mailer_templates_confirmation_content: file('confirm-signup.html'),
  mailer_subjects_recovery: 'Reset your ReadTraining password',
  mailer_templates_recovery_content: file('reset-password.html'),
  mailer_subjects_email_change: 'Confirm your new email address',
  mailer_templates_email_change_content: file('change-email.html'),
  mailer_subjects_reauthentication: 'Your ReadTraining confirmation code',
  mailer_templates_reauthentication_content: file('reauthentication.html'),
}
const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`
const headers = { authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'content-type': 'application/json' }
const res = await fetch(api, { method: 'PATCH', headers, body: JSON.stringify(settings) })
if (!res.ok) throw new Error(`Supabase refused (${res.status}): ${(await res.text()).slice(0, 300)}`)
// read back and compare, so a silent partial update can't pass as done
const now = await (await fetch(api, { headers })).json()
const wrong = Object.keys(settings).filter((k) => now[k] !== settings[k])
console.log(`${live ? 'LIVE' : 'Development'} project ${ref}: ${wrong.length ? `NOT applied: ${wrong.join(', ')}` : 'templates, subjects and sender name set'}`)
process.exitCode = wrong.length ? 1 : 0
