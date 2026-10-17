// Sets a Supabase project's sign-in settings to ReadTraining's choices (supabase/README.md, section 3) through the Supabase
// Management API, then reads every value back. Email sending uses SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and EMAIL_FROM
// from the root .env (the same values the API uses). Needs SUPABASE_ACCESS_TOKEN.
//
//   pnpm supabase:auth            development / test project
//   pnpm supabase:auth --live     live project
//   … --site https://…            also set the site's address (Site URL) and allow its /auth/confirm and /auth/callback
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
const args = process.argv.slice(2)
const live = args.includes('--live')
const site = args.includes('--site') ? (args[args.indexOf('--site') + 1] || '').replace(/\/$/, '') : null
const url = live ? env.LIVE_SUPABASE_URL : env.NEXT_PUBLIC_SUPABASE_URL
const missing = ['SUPABASE_ACCESS_TOKEN', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'].filter((k) => !env[k])
if (!url) missing.push(live ? 'LIVE_SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_URL')
const sender = (env.EMAIL_FROM || '').match(/<([^>]+)>/)?.[1] ?? env.EMAIL_FROM
if (missing.length) {
  console.error(`Add these to the root .env first: ${missing.join(', ')}`)
  process.exitCode = 1
} else {
  const settings = {
    // accounts: email sign-up with a confirmation link, passwords of at least 8 characters
    external_email_enabled: true,
    mailer_autoconfirm: false,
    password_min_length: 8,
    // changing an email needs both addresses to confirm; changing a password needs the current one
    mailer_secure_email_change_enabled: true,
    security_update_password_require_reauthentication: true,
    security_update_password_require_current_password: true,
    // two-step sign-in with an authenticator app (admins)
    mfa_totp_enroll_enabled: true,
    mfa_totp_verify_enabled: true,
    // email through the same SMTP provider as the API, sent as ReadTraining
    smtp_host: env.SMTP_HOST,
    smtp_port: String(env.SMTP_PORT),
    smtp_user: env.SMTP_USER,
    smtp_pass: env.SMTP_PASS,
    smtp_admin_email: sender,
    smtp_sender_name: 'ReadTraining',
    rate_limit_email_sent: 30,
  }
  const ref = new URL(url).host.split('.')[0]
  const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`
  const headers = { authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'content-type': 'application/json' }
  if (site) {
    // email links and sign-ins may only come back to this site's two return pages (plus any already allowed)
    const current = await (await fetch(api, { headers })).json()
    settings.site_url = site
    settings.uri_allow_list = [...new Set([...(current.uri_allow_list || '').split(',').map((x) => x.trim()).filter(Boolean), `${site}/auth/confirm**`, `${site}/auth/callback**`])].join(',')
  }
  const res = await fetch(api, { method: 'PATCH', headers, body: JSON.stringify(settings) })
  if (!res.ok) {
    console.error(`Supabase refused (${res.status}): ${(await res.text()).slice(0, 300)}`)
    process.exitCode = 1
  } else {
    const now = await (await fetch(api, { headers })).json()
    // the SMTP password is never read back, so it can't be compared
    const wrong = Object.keys(settings).filter((k) => k !== 'smtp_pass' && String(now[k]) !== String(settings[k]))
    console.log(`${live ? 'LIVE' : 'Development'} project ${ref}: ${wrong.length ? `NOT applied: ${wrong.join(', ')}` : 'sign-in settings and email sending set'}`)
    process.exitCode = wrong.length ? 1 : 0
  }
}
