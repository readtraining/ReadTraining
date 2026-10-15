"use client";

import { createBrowserClient } from "@supabase/ssr";

// The browser's Supabase client (Auth for now). It keeps the session in cookies so the server (proxy.js, /auth/callback) sees
// the same signed-in user. Uses only the publishable key, which is safe in the browser; the service role key never comes here.
let client;
export function getSupabase() {
  if (!client) client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return client;
}
