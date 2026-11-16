import { topicName } from "@/lib/taxonomy";

// Reviews of Read Training on the website (lib/siteReviewsServer.js loadReviews: the published ones, newest first: [{ id,
// name, rating, text, topic, origin, originUrl, onHome }]). Real customers' words only. The home page and Customer reviews show
// a selection, and say the overall rating (the trust numbers) counts every review. A review names a course topic
// ("category/sub-category/topic") only when its text clearly names that course; the others are about us in general. A course
// page shows the reviews that name its topic, as reviews of Read Training (a course page lists several providers' dates), a page
// at a time; when none does, a few general ones that name no kind of course either, said to be about Read Training in general
// (the API picks them: content.courseReviews, lib/siteReviewsServer.js loadCourseReviews).

export const REVIEWS_HREF = "/customer-reviews";
export const HOME_MAX = 4;

// the reviews ticked for the home page, at most four
export const homeReviews = (reviews) => reviews.filter((r) => r.onHome).slice(0, HOME_MAX);

// the course a review names, as the catalogue calls it ("Door Supervisor"), or "" for a general one. Call after loadTaxonomy().
export const reviewCourse = (review) => {
  if (!review.topic) return "";
  const [c, s, t] = review.topic.split("/");
  return topicName(c, s, t);
};

// a course's catalogue place as content.courseReviews takes it: "category/sub-category/topic", shorter when it has no topic (or
// no sub-category), null when it isn't filed anywhere
export const reviewPlace = (...parts) => {
  const end = parts.findIndex((p) => !p);
  return (end < 0 ? parts : parts.slice(0, end)).join("/") || null;
};

// Customer reviews, filtered to one course (its name as the filter shows it)
