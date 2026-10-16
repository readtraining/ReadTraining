import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";

// The workspace a /provider or /business page belongs to (server only). proxy.js has already checked access for this
// request and passes the result in the x-rt-workspace header; if it's missing (a prefetch, or the proxy didn't run), this asks
// the API itself, so a layout never shows a workspace without a check. Returns { workspace } or { denied } / { unavailable }.
export async function getWorkspace(type) {
  const h = await headers();
  const passed = h.get("x-rt-workspace");
  if (passed) {
    try {
      const workspace = JSON.parse(decodeURIComponent(passed));
      if (workspace?.type === type) return { workspace };
    } catch {}
  }
  const { data } = await (await getServerSupabase()).auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { denied: true };
  const origin = `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host")}`;
  const api = process.env.NEXT_PUBLIC_API_URL || origin;
  const input = encodeURIComponent(JSON.stringify({ json: { type, path: `/${type}` } }));
  try {
    const res = await fetch(`${api}/api/trpc/organisations.openWorkspace?input=${input}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.status === 200) return { workspace: (await res.json())?.result?.data?.json };
    return res.status === 403 || res.status === 401 ? { denied: true } : { unavailable: true };
  } catch {
    return { unavailable: true };
  }
}
