import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Supabase on the server (route handlers and server components): reads and writes the session cookies the browser client set.
// A server component cannot set cookies, so writes there are skipped; proxy.js keeps the session fresh instead.
// Without the two NEXT_PUBLIC_SUPABASE_ settings it returns a signed-out stand-in, so pages render for visitors instead of erroring.
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const notConfigured = new Error("Supabase is not configured");
const signedOut = {
  auth: {
    getClaims: async () => ({ data: null, error: null }),
    exchangeCodeForSession: async () => ({ data: null, error: notConfigured }),
    verifyOtp: async () => ({ data: null, error: notConfigured }),
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

// The signed-in person on the server, from the verified token (getClaims checks its signature against the project's public
// keys, so it can't be faked with a cookie). Returns the claims (sub, email, aal, user_metadata …) or null.
export async function getServerClaims() {
  const { data } = await (await getServerSupabase()).auth.getClaims();
  return data?.claims ?? null;
}
