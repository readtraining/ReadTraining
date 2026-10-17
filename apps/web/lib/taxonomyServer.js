import "server-only";
import { setTaxonomy } from "@/lib/taxonomy";

// Server side: the catalogue list from the API (catalogue.taxonomy), cached by Next for 5 minutes, so a change an admin makes
// shows on the site within minutes without a deploy. If the API can't be reached the list is empty (filters and menus show
// nothing rather than stale or invented entries) and it is asked for again on the next request.
const API = process.env.NEXT_PUBLIC_API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:4000");

export async function loadTaxonomy() {
  try {
    const res = await fetch(`${API}/api/trpc/catalogue.taxonomy`, { next: { revalidate: 300, tags: ["taxonomy"] } });
    if (!res.ok) throw new Error(String(res.status));
    const t = (await res.json())?.result?.data?.json;
    setTaxonomy(t);
    return t;
  } catch {
    return { categories: [], methods: [], levels: [], unavailable: true };
  }
}
