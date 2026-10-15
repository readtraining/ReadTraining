import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Supabase on the server (route handlers and server components): reads and writes the session cookies the browser client set.
// A server component cannot set cookies, so writes there are skipped; proxy.js keeps the session fresh instead.
// Without the two NEXT_PUBLIC_SUPABASE_ settings it returns a signed-out stand-in, so pages render for visitors instead of erroring.
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const signedOut = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    exchangeCodeForSession: async () => ({ data: null, error: new Error("Supabase is not configured") }),
  },
};

export async function getServerSupabase() {
  if (!SB_URL || !SB_KEY) return signedOut;
  const store = await cookies();
  return createServerClient(SB_URL, SB_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

// Only paths on this site may be a redirect target (no open redirects through ?next=).
export const safeNext = (value, fallback = "/account") => (typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : fallback);
