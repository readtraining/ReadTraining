import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";

// Server only: tRPC calls to the API as the signed-in person (their access token as Bearer): queries for the layouts that
// check access themselves, mutations for server routes (the welcome email after /auth/confirm). Return { status, data };
// status 401 without a session, 503 when the API can't be reached in time.
export const queryApiAsUser = (procedure, input) => callApiAsUser(procedure, input, false);
export const mutateApiAsUser = (procedure, input) => callApiAsUser(procedure, input, true);

async function callApiAsUser(procedure, input, mutation) {
  const { data } = await (await getServerSupabase()).auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { status: 401, data: null };
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host")}`;
  const api = process.env.NEXT_PUBLIC_API_URL || origin;
  try {
    const res = mutation
      ? await fetch(`${api}/api/trpc/${procedure}`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ json: input ?? null }), cache: "no-store", signal: AbortSignal.timeout(8000) })
      : await fetch(`${api}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    return { status: res.status, data: res.status === 200 ? (await res.json())?.result?.data?.json ?? null : null };
  } catch {
    return { status: 503, data: null };
  }
}
