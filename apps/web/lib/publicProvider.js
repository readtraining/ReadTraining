import { cache } from "react";
import { headers } from "next/headers";

// A provider created on ReadTraining (an organisation in the database), for its public profile (/providers/<slug>), read from
// the API's organisations.providerProfile (server only). Returns { name, slug, approved, since } or null. cache(): the page and
// its metadata share one request.
export const getPublicProvider = cache(async (slug) => {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") || "http"}://${h.get("x-forwarded-host") || h.get("host")}`;
  const api = process.env.NEXT_PUBLIC_API_URL || origin;
  const input = encodeURIComponent(JSON.stringify({ json: { slug } }));
  try {
    const res = await fetch(`${api}/api/trpc/organisations.providerProfile?input=${input}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json())?.result?.data?.json ?? null;
  } catch {
    return null;
  }
});
