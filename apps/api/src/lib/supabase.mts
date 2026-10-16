import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/**
 * Server-side Supabase admin client (service role: auth admin, storage, etc).
 * Database queries go through Drizzle, not this client.
 */
export const supabase =
  url && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null

// Verifies access tokens only. Uses the publishable key: verification needs no secret, and the service role stays out of it.
const verifier = url && publishableKey ? createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null
const issuer = url ? `${url.replace(/\/$/, '')}/auth/v1` : null

export type VerifiedUser = {
  id: string
  email: string | null
  aal: 'aal1' | 'aal2'
  sessionId: string | null
}

/**
 * Checks a Supabase access token: signature (ES256, against the project's public keys, cached), expiry, issuer, audience
 * and role. Returns the user it belongs to, or null for anything missing, forged, expired or not a signed-in user.
 */
export async function verifyAccessToken(token: string | undefined): Promise<VerifiedUser | null> {
  if (!token || !verifier || !issuer) return null
  const { data, error } = await verifier.auth.getClaims(token)
  if (error || !data?.claims) return null
  const c = data.claims
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud]
  if (c.iss !== issuer || !aud.includes('authenticated') || c.role !== 'authenticated' || c.is_anonymous === true || typeof c.sub !== 'string') return null
  return {
    id: c.sub,
    email: typeof c.email === 'string' ? c.email : null,
    aal: c.aal === 'aal2' ? 'aal2' : 'aal1',
    sessionId: typeof c.session_id === 'string' ? c.session_id : null,
  }
}
