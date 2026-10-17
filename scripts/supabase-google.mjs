// Switches on "Sign in with Google" in a Supabase project and sets the addresses Supabase may send people back to, through the
// Supabase Management API. Uses from the root .env: SUPABASE_ACCESS_TOKEN, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (from
// Google Cloud → Google Auth Platform → Clients; never committed).
//
//   pnpm supabase:google                      development / test project, site http://localhost:3000
//   pnpm supabase:google --site https://…     with the site's real address (adds it to the allowed addresses)
//   pnpm supabase:google --live --site https://…
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
const site = (args[args.indexOf('--site') + 1] && args.includes('--site') ? args[args.indexOf('--site') + 1] : 'http://localhost:3000').replace(/\/$/, '')
const url = live ? env.LIVE_SUPABASE_URL : env.NEXT_PUBLIC_SUPABASE_URL
const missing = ['SUPABASE_ACCESS_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'].filter((k) => !env[k])
if (!url) missing.push(live ? 'LIVE_SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_URL')
if (missing.length) {
  console.error(`Add these to the root .env first: ${missing.join(', ')}`)
  process.exitCode = 1
} else {
  const ref = new URL(url).host.split('.')[0]
  const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`
  const headers = { authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'content-type': 'application/json' }
  const current = await (await fetch(api, { headers })).json()
  // keep any addresses already allowed, and add this site's two return pages
  const allow = [...new Set([...(current.uri_allow_list || '').split(',').map((s) => s.trim()).filter(Boolean), `${site}/auth/confirm**`, `${site}/auth/callback**`])].join(',')
  const settings = { external_google_enabled: true, external_google_client_id: env.GOOGLE_CLIENT_ID, external_google_secret: env.GOOGLE_CLIENT_SECRET, uri_allow_list: allow }
  const res = await fetch(api, { method: 'PATCH', headers, body: JSON.stringify(settings) })
  if (!res.ok) {
    console.error(`Supabase refused (${res.status}): ${(await res.text()).slice(0, 300)}`)
    process.exitCode = 1
  } else {
    const now = await (await fetch(api, { headers })).json()
    const ok = now.external_google_enabled === true && now.external_google_client_id === env.GOOGLE_CLIENT_ID && now.uri_allow_list === allow
    console.log(`${live ? 'LIVE' : 'Development'} project ${ref}: ${ok ? 'Google sign-in on' : 'NOT fully applied'}; allowed return addresses: ${now.uri_allow_list}`)
    console.log(`Google Cloud needs this "Authorised redirect URI": ${url.replace(/\/$/, '')}/auth/v1/callback`)
    process.exitCode = ok ? 0 : 1
  }
}
