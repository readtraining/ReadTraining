import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";

// Server only: a tRPC query to the API as the signed-in person (their access token as Bearer), for the layouts that check
// access themselves. Returns { status, data }; status 401 without a session, 503 when the API can't be reached.
export async function queryApiAsUser(procedure, input) {
  const { data } = await (await getServerSupabase()).auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { status: 401, data: null };
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host")}`;
  const api = process.env.NEXT_PUBLIC_API_URL || origin;
  try {
    const res = await fetch(`${api}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    return { status: res.status, data: res.status === 200 ? (await res.json())?.result?.data?.json ?? null : null };
  } catch {
    return { status: 503, data: null };
  }
}
