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
    // where proxy.js and server pages reach the API (local: http://localhost:4000; on Vercel empty, so the site's own address)
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
  },
  images: { unoptimized: true },
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
    ]
  },
}

export default nextConfig
