import { headers } from "next/headers";
import { queryApiAsUser } from "@/lib/serverApi";

// The admin a /admin page is opened by (server only): { id, name, email, preset, permissions, twoStep } or null. proxy.js has
// already asked the API for this request and passes the answer in the x-rt-admin header; without it (a prefetch, or the proxy
// didn't run) this asks the API itself, so the panel never opens without a check. { unavailable: true } when the API couldn't
// be reached, so the page can say so instead of signing the admin out.
export async function getAdminAccess() {
  const passed = (await headers()).get("x-rt-admin");
  if (passed) {
    try {
      return JSON.parse(decodeURIComponent(passed));
    } catch {}
  }
  const { status, data } = await queryApiAsUser("admin.open", { path: "/admin" });
  if (status >= 500) return { unavailable: true };
  return status === 200 ? data : null;
}
