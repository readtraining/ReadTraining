import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Supabase on the server (route handlers and server components): reads and writes the session cookies the browser client set.
// A server component cannot set cookies, so writes there are skipped; proxy.js keeps the session fresh instead.
export async function getServerSupabase() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
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
