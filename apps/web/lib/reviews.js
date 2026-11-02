// Mock exam reviews. There is no reviews endpoint in apps/api yet, so reading returns none (the section stays hidden: the
// testReview switch in lib/forms.js); a review is sent through that switch once it holds the real request.

// [{ id, name, rating (1-5), text, date (ISO) }], newest first
export async function getReviews(subjectSlug) {
  return [];
}
