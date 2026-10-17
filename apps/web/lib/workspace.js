import { headers } from "next/headers";
import { queryApiAsUser } from "@/lib/serverApi";

// The workspace a /provider or /business page belongs to (server only). proxy.js has already checked access for this
// request and passes the result in the x-rt-workspace header; if it's missing (a prefetch, or the proxy didn't run), this asks
// the API itself, so a layout never shows a workspace without a check. Returns { workspace } or { denied } / { unavailable }.
export async function getWorkspace(type) {
  const passed = (await headers()).get("x-rt-workspace");
  if (passed) {
    try {
      const workspace = JSON.parse(decodeURIComponent(passed));
      if (workspace?.type === type) return { workspace };
    } catch {}
  }
  const { status, data } = await queryApiAsUser("organisations.openWorkspace", { type, path: `/${type}` });
  if (status === 200 && data) return { workspace: data };
  return status === 403 || status === 401 ? { denied: true } : { unavailable: true };
}
