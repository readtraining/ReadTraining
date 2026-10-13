// Mock exam reviews. There is no reviews endpoint in apps/api yet, so reading returns none and sending only simulates the
// call (as lib/quote.js does for group quotes). Replace both bodies with the real requests (tRPC query / mutation) when the
// endpoint exists; the reviews section already lists real reviews and handles a rejected promise with an error message.

// [{ id, name, rating (1-5), text, date (ISO) }], newest first
export async function getReviews(subjectSlug) {
  return [];
}

export async function submitReview({ subject, rating, name, text }) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: true, data: { subject, rating, name, text } };
}
