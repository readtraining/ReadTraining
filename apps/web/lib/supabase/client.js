"use client";

import { createBrowserClient } from "@supabase/ssr";

// The browser's Supabase client (Auth for now). It keeps the session in cookies so the server (proxy.js, /auth/callback) sees
// the same signed-in user. Uses only the publishable key, which is safe in the browser; the service role key never comes here.
// Without the two NEXT_PUBLIC_SUPABASE_ settings (for example a deployment where they were not added) the site works signed out:
// useAuthUser reports nobody, and the sign-in actions throw a message the forms show, instead of the page crashing and retrying.
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const isSupabaseConfigured = Boolean(SB_URL && SB_KEY);

let client;
export function getSupabase() {
  if (!isSupabaseConfigured) throw new Error("Sign-in isn't available right now. Please try again later.");
  if (!client) client = createBrowserClient(SB_URL, SB_KEY);
  return client;
}
