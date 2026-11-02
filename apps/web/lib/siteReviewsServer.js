import "server-only";

// Server side: the customer reviews the website shows (API content.reviews: the published ones, newest first), saved by
// Next for a minute under the tag "reviews". An admin's change marks it out of date (app/admin/actions.js refreshReviews), so
// pages pick it up within seconds. If the API can't be reached there are none, and the review sections are left out.
const API = process.env.NEXT_PUBLIC_API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:4000");

export async function loadReviews() {
  try {
    const res = await fetch(`${API}/api/trpc/content.reviews`, { next: { revalidate: 60, tags: ["reviews"] } });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json())?.result?.data?.json ?? [];
  } catch {
    return [];
  }
}
