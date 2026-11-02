// The website's public forms must never fake a result. Run in CI (and by `pnpm check:forms`); it fails when the web app has:
//  1. a made-up reference: a template string like `RT-${…Math.random…}` or `…Date.now()…` (a reference only comes from the server);
//  2. a simulated send: `await new Promise((resolve) => setTimeout(resolve, …))` (a form either really sends or isn't shown);
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
// the learner account's bookings and cancellations (signed in; rebuilt with the booking milestone; no booking can exist while
// the checkout switch is off)
const ALLOWED_REFS = new Set(['lib/account.js'])

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

const problems = []
for (const p of files) {
  const rel = relative(web, p).split(sep).join('/')
  const s = readFileSync(p, 'utf8')
  if (/`[A-Z]{2,3}-\$\{[^`]*(Math\.random|Date\.now)/.test(s) && !ALLOWED_REFS.has(rel)) problems.push(`${rel}: makes up a reference. References come only from the server.`)
  if (/new Promise\(\(?resolve\)? => setTimeout\(resolve/.test(s) && !ALLOWED_WAITS.has(rel))
    problems.push(`${rel}: simulates a send with setTimeout. Put the real request in the form's switch in lib/forms.js instead.`)
  if (/<form\b/.test(s) && /onSubmit=/.test(s) && !ALLOWED_FORMS.has(rel) && !/from "@\/components\/forms\/FormGate"/.test(s))
    problems.push(`${rel}: a public form that doesn't go through <FormGate>. Add it to lib/forms.js and wrap it in <FormGate form="…">.`)
}

if (problems.length) {
  console.error(`Public forms check failed:\n  ${problems.join('\n  ')}\nSee apps/web/lib/forms.js.`)
  process.exit(1)
}
console.log(`Public forms check passed (${files.length} files).`)
