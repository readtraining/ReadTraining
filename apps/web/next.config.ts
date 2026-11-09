import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import type { NextConfig } from 'next'

// The monorepo keeps one .env at the root (the API reads it too); load it for the web app as well. Only NEXT_PUBLIC_ values
// reach the browser; the rest (the service role key) stay on the server.
// forceReload: Next has already loaded (and cached) the web app's own folder, which has no .env
loadEnvConfig(path.resolve(process.cwd(), '../..'), process.env.NODE_ENV !== 'production', { info: () => {}, error: console.error }, true)

// ---- security headers, on every page ----------------------------------------------------------------------------------------
// Content-Security-Policy: where the page may load scripts, styles, pictures, frames and connections from, so injected markup
// can't pull in another site's script or send data elsewhere, and no other site can show ReadTraining in a frame (clickjacking).
// The outside services the site really uses:
// - Supabase (sign-in, data, pictures in course-media) and the API (on Vercel the site's own /api; locally :4000);
// - Google sign-in (its script, frame and style from accounts.google.com);
// - course videos (youtube-nocookie.com and Vimeo frames); the test-centre search's postcode lookups (api.postcodes.io);
// - Google Analytics, for when its tag is added (lib/analytics.js already queues the events).
// 'unsafe-inline' scripts: Next's own inline start-up scripts (the pages are prebuilt, so a per-request nonce isn't possible);
// 'unsafe-eval' only in development (hot reload). Add an origin here before using a new outside service in the browser.
const isDev = process.env.NODE_ENV !== 'production'
const originOf = (url: string | undefined) => {
  try {
    return url ? new URL(url).origin : ''
  } catch {
    return ''
  }
}
const supabase = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL)
const api = originOf(process.env.NEXT_PUBLIC_API_URL)
// Cloudflare Turnstile, the human check on sign-in and public forms (lib/humanCheck.js): its script and its frame
const TURNSTILE = 'https://challenges.cloudflare.com'
const GA = ['https://www.googletagmanager.com', 'https://www.google-analytics.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com']
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://accounts.google.com ${TURNSTILE} ${GA[0]}`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  `img-src 'self' data: blob: ${supabase} https://lh3.googleusercontent.com https://platform-lookaside.fbsbx.com https://*.fbcdn.net ${GA.join(' ')}`,
  "font-src 'self' data:",
  `connect-src 'self' ${api} ${supabase} ${supabase.replace(/^https:/, 'wss:')} https://accounts.google.com https://api.postcodes.io ${TURNSTILE} ${GA.join(' ')}${isDev ? ' ws: http://localhost:*' : ''}`,
  `frame-src 'self' https://accounts.google.com ${TURNSTILE} https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
]
  .map((d) => d.replace(/\s+/g, ' ').trim())
  .join('; ')
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: csp },
  // HTTPS only, for a year (not includeSubDomains: other services on the client's domain may not be on HTTPS)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  // a file is what its type says (no guessing a script out of an upload)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // other sites see only our address, not the page or its query (a search, a booking reference)
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // older browsers' version of frame-ancestors
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // no camera, microphone or payment handler; location only for our own "Use my location"
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), interest-cohort=()' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false, // no "X-Powered-By: Next.js" (the API sends none either)
  // the public Supabase values, inlined for the browser, the server and proxy.js (the edge runtime does not read the root .env)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    // Google's sign-in button needs the Google Cloud client ID in the browser (public by design; the secret stays in Supabase)
    // trimmed: a value pasted into Vercel with a trailing line break made Google answer "client ID not found"
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: (process.env.GOOGLE_CLIENT_ID ?? '').trim(),
    // the address Google's button is allowed on (besides localhost): the site's own, or the live Vercel address
    NEXT_PUBLIC_GOOGLE_ORIGIN: process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : ''),
    // where proxy.js and server pages reach the API (local: http://localhost:4000; on Vercel empty, so the site's own address)
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
    // made-up demo records: off on the live site (a production build on Vercel), on everywhere else (lib/demo.js)
    NEXT_PUBLIC_SHOW_DEMO: process.env.SHOW_DEMO ?? (process.env.VERCEL_ENV === 'production' ? 'off' : 'on'),
  },
  images: { unoptimized: true },
  // the shared permission table is TypeScript source (packages/permissions); the browser uses it only to hide buttons
  transpilePackages: ['@readtraining/permissions'],
  // the test copy (Vercel preview deployments) can be opened by anyone with the link, but search engines never index it
  async headers() {
    return [
      { source: '/(.*)', headers: SECURITY_HEADERS },
      ...(process.env.VERCEL_ENV === 'preview' ? [{ source: '/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }] : []),
    ]
  },
  // pages that left the template routes (auth, shop, checkout): old links and bookmarks land on the new addresses, query kept
  async redirects() {
    return [
      { source: '/template/courses-list-1', destination: '/courses', permanent: true },
      { source: '/template/courses/:id', destination: '/course/:id', permanent: true },
      { source: '/template/course-cart', destination: '/basket', permanent: true },
      { source: '/template/quote', destination: '/quote', permanent: true },
      { source: '/template/login', destination: '/login', permanent: true },
      { source: '/template/signup', destination: '/signup', permanent: true },
      { source: '/forget-password', destination: '/forgot-password', permanent: true },
      { source: '/template/course-checkout', destination: '/checkout', permanent: true },
      // the account's pages renamed to the client's menu (My learning, Purchase history, Account settings)
      { source: '/account/bookings', destination: '/account/purchases', permanent: true },
      { source: '/account/profile', destination: '/account/settings', permanent: true },
      // certificates had a tab on the learners page; they have their own page now
      { source: '/admin/learners', has: [{ type: 'query', key: 'tab', value: 'certificates' }], destination: '/admin/certificates', permanent: true },
      // learners have no notifications page (Hurak's has one): the nearest is the emails they get, in Account settings
      { source: '/account/notifications', destination: '/account/settings#rt-pf-mkt-h', permanent: false },
      // the old provider workspace prototype
      { source: '/admin/provider', destination: '/provider', permanent: true },
      // delivery methods: the address is the method's name (brief §4); the client's old words redirect
      { source: '/courses/virtual', destination: '/courses/live-online', permanent: true },
      { source: '/courses/online', destination: '/courses/self-paced', permanent: true },
      { source: '/courses/on-demand', destination: '/courses/self-paced', permanent: true },
      // the old course-in-a-town pages (/course-locations/<slug>) go to the course, or its search: app/course-locations/[slug]/route.js
    ]
  },
}

export default nextConfig
