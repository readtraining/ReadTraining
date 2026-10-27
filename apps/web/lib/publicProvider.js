import "server-only";
import { cache } from "react";

// The real providers for the public pages (server only), from the API: one provider's public profile with its live courses
// (organisations.providerProfile; null when there's no such provider, or it is suspended or not approved), and the directory of
// approved providers (organisations.providerDirectory; [] when the API can't be reached). Saved by Next for a minute under the
// tag "courses", like the catalogue. cache(): a page and its metadata share one request.
const API = process.env.NEXT_PUBLIC_API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:4000");

async function query(procedure, input) {
  const url = `${API}/api/trpc/${procedure}${input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`}`;
  const res = await fetch(url, { next: { revalidate: 60, tags: ["courses"] } });
  if (!res.ok) return null;
  return (await res.json())?.result?.data?.json ?? null;
}

export const getPublicProvider = cache(async (slug) => {
  try {
    return await query("organisations.providerProfile", { slug: String(slug).slice(0, 80) });
  } catch {
    return null;
  }
});

export const getProviderDirectory = cache(async () => {
  try {
    return (await query("organisations.providerDirectory")) || [];
  } catch {
    return [];
  }
});
