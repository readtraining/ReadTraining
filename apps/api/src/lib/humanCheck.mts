// Cloudflare Turnstile, the "are you human?" check, verified on our side for the public forms that send to our API
// (publicFormProcedure in trpc/trpc.mts). Sign-up, sign-in and forgot password are checked by Supabase itself (its CAPTCHA
// protection, with the same Turnstile widget). Each token is single-use and lasts five minutes.
//
// TURNSTILE_SECRET_KEY is the widget's secret (set for production in Vercel). Preview and development copies without it use
// Cloudflare's published test secret, which accepts the test site key's token (apps/web/lib/humanCheck.js), so they work
// without the live widget; production without a secret refuses, so the check can never be skipped on the live site.
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TEST_SECRET = '1x0000000000000000000000000000000AA' // Cloudflare's "always passes" test secret
const production = (process.env.VERCEL_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development')) === 'production'
const secret = process.env.TURNSTILE_SECRET_KEY || (production ? null : TEST_SECRET)

/** True when Cloudflare confirms the token came from a person, just now, on our widget. */
export async function isHuman(token: string | undefined, ip: string | null): Promise<boolean> {
  if (!token || !secret) return false
  try {
    const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) })
    const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(8000) })
    const out = (await res.json()) as { success?: boolean }
    return out.success === true
  } catch (e) {
    console.error(`turnstile: could not verify (${e instanceof Error ? e.message.split('\n')[0] : 'error'})`)
    return false
  }
}
