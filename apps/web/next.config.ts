import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import type { NextConfig } from 'next'

// The monorepo keeps one .env at the root (the API reads it too); load it for the web app as well. Only NEXT_PUBLIC_ values
// reach the browser; the rest (the service role key) stay on the server.
// forceReload: Next has already loaded (and cached) the web app's own folder, which has no .env
loadEnvConfig(path.resolve(process.cwd(), '../..'), process.env.NODE_ENV !== 'production', { info: () => {}, error: console.error }, true)

const nextConfig: NextConfig = {
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
    return process.env.VERCEL_ENV === 'preview' ? [{ source: '/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }] : []
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
      // the old provider workspace prototype
      { source: '/admin/provider', destination: '/provider', permanent: true },
      // delivery methods: the address is the method's name (brief §4); the client's old words redirect
      { source: '/courses/virtual', destination: '/courses/live-online', permanent: true },
      { source: '/courses/online', destination: '/courses/self-paced', permanent: true },
      { source: '/courses/on-demand', destination: '/courses/self-paced', permanent: true },
      // the old course-in-a-town pages: a course's dates in a town are now the course finder's location search
      { source: '/course-locations/:slug', destination: '/courses', permanent: true },
    ]
  },
}

export default nextConfig
