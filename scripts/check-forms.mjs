// The website's public forms must never fake a result. Run in CI (and by `pnpm check:forms`); it fails when the web app has:
//  1. a made-up reference: a short capital prefix ("RT-", `REF${…}`) joined to Math.random, Date.now or randomUUID, or a
//     reference / ref value made from them (a reference only comes from the server);
//  2. a simulated send: a wait (`new Promise((r) => setTimeout(r, …))`, whatever the callback is called) or a timer that marks the
//     form sent (`setTimeout(() => setSent(true), …)`) (a form either really sends or isn't shown);
//  3. a public form that doesn't go through <FormGate> (components/forms/FormGate.jsx), the one place that decides between the
//     form and its "coming soon" panel from the form's switch in apps/web/lib/forms.js.
// Signed-in areas (account, business, provider, admin) talk to the API or are labelled demo, so they are left out. Searches and
// a few real forms are listed below as allowed.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const web = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'apps', 'web')
const SKIP_DIRS = new Set(['node_modules', '.next', 'public',
  // signed-in areas
  'account', 'admin', 'business', 'businessAccount', 'provider', 'providerWorkspace'])
// public forms that are not submissions to us, or that already talk to the API
const ALLOWED_FORMS = new Set([
  'components/basket/BasketSummary.jsx', // the promo code: a price preview; the order itself is the checkout form
  'components/courses/CourseCatalogue.jsx', 'components/header/NavCard.jsx', 'components/help/HelpSearch.jsx', // searches
  'components/home/HomeSearch.jsx', 'components/home/HomeSearchBand.jsx', 'components/hseTest/CentreFinder.jsx',
  'components/providers/ProviderDirectory.jsx', 'components/testPrep/TestPrepHub.jsx',
  'components/providerSignup/BecomeProvider.jsx', 'components/providerSignup/ProviderOnboarding.jsx', // the API (organisations.*)
  'components/others/LoginForm.jsx', 'components/others/SignUpFormv2.jsx', 'components/others/ForgotPasswordForm.jsx', // sign-in,
  'components/others/ResetPasswordForm.jsx', // Supabase Auth (lib/auth)
])
// a short pause to show a "checking" state, not a fake send
const ALLOWED_WAITS = new Set(['lib/auth/useSignUpForm.js', 'components/others/LoginForm.jsx'])
// the signed-in areas' demo records, which sit in lib/ rather than in the areas' folders: the learner account's bookings and
// cancellations, the business account's learners and team, and the provider workspace (each labelled demo on its pages; rebuilt
// with the booking milestone; no booking can exist while the checkout switch is off)
const SIGNED_IN_FILES = new Set(['lib/account.js', 'lib/businessAccount.js', 'lib/providerWorkspace.js'])

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(p)
    } else if (/\.(jsx?|tsx?)$/.test(name)) files.push(p)
  }
}
for (const d of ['app', 'components', 'lib']) walk(join(web, d))

const MADE_UP_REF = [
  /`[A-Z]{2,4}-?\$\{[^`]*(Math\.random|Date\.now|randomUUID)/, // `RT-${Math.random()…}`
  /["'][A-Z]{2,4}-?["']\s*\+[^;\n]*(Math\.random|Date\.now|randomUUID)/, // "RT-" + Date.now()
  /\b(ref|reference)\w*\s*[:=]\s*[^;\n]*(Math\.random|Date\.now|randomUUID)/i, // reference: crypto.randomUUID()
]
const FAKE_SEND = [
  /new Promise\(\(?(\w+)\)?\s*=>\s*setTimeout\(\1\b/, // await new Promise((r) => setTimeout(r, 800))
  /setTimeout\(\s*\(\)\s*=>\s*\{?\s*set(Sent|Done|Submitted|Success|Status)\(/, // setTimeout(() => setSent(true), 800)
]

const problems = []
for (const p of files) {
  const rel = relative(web, p).split(sep).join('/')
  if (SIGNED_IN_FILES.has(rel)) continue
  const s = readFileSync(p, 'utf8')
  if (MADE_UP_REF.some((re) => re.test(s))) problems.push(`${rel}: makes up a reference. References come only from the server.`)
  if (FAKE_SEND.some((re) => re.test(s)) && !ALLOWED_WAITS.has(rel))
    problems.push(`${rel}: simulates a send with setTimeout. Put the real request in the form's switch in lib/forms.js instead.`)
  if (/<form\b/.test(s) && /onSubmit=/.test(s) && !ALLOWED_FORMS.has(rel) && !/from "@\/components\/forms\/FormGate"/.test(s))
    problems.push(`${rel}: a public form that doesn't go through <FormGate>. Add it to lib/forms.js and wrap it in <FormGate form="…">.`)
}

if (problems.length) {
  console.error(`Public forms check failed:\n  ${problems.join('\n  ')}\nSee apps/web/lib/forms.js.`)
  process.exit(1)
}
console.log(`Public forms check passed (${files.length} files).`)
