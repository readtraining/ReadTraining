import "server-only";
import { setSiteContent } from "@/lib/siteContent";

// Server side: the site's editable content from the API (content.site), saved by Next for 5 minutes under the tag "content".
// An admin's change marks it out of date (app/admin/actions.js), so pages pick it up within seconds. If the API can't be
// reached the built-in wording is used.
const API = process.env.NEXT_PUBLIC_API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:4000");

export async function loadSiteContent() {
  try {
    const res = await fetch(`${API}/api/trpc/content.site`, { next: { revalidate: 300, tags: ["content"] } });
    if (!res.ok) throw new Error(String(res.status));
    const stored = (await res.json())?.result?.data?.json ?? {};
    setSiteContent(stored);
    return stored;
  } catch {
    return {};
  }
}
