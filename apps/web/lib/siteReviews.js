import { matchesPick } from "@/lib/catalogueData";
import { topicName } from "@/lib/taxonomy";

// Reviews of Read Training on the website (lib/siteReviewsServer.js loadReviews: the published ones, newest first: [{ id,
// name, rating, text, topic, origin, originUrl, onHome }]). Real customers' words only. The home page and Customer reviews show
// a selection, and say the overall rating (the trust numbers) counts every review. A review names a course topic
// ("category/sub-category/topic") only when its text clearly names that course; the others are about us in general. A course
// page shows the reviews that name its topic, as reviews of Read Training (a course page lists several providers' dates); when
// none does, a few general ones (GENERAL_MAX) that name no kind of course either, said to be about Read Training in general.

export const REVIEWS_HREF = "/customer-reviews";
export const HOME_MAX = 4;
export const GENERAL_MAX = 4;

// Words that tie a review to a kind of course or a subject. Many reviews with no topic still say what they trained for ("my SIA
// training"), which on the Food Hygiene page would read as a review of that course; a general review shown on a course page has
// none of them. Generous on purpose: leaving out a review that only seems to name a subject costs nothing.
const SUBJECT_WORDS =
  /\b(sia|door\w*|bouncers?|steward\w*|guard\w*|secur\w*|cctv|surveillance|close protection|conflict|physical|top[ -]?ups?|licen[cs]\w*|first[ -]?aid\w*|e?faw|paediatric|cpr|cscs|citb|hs&e|smsts|sssts|construction|asbestos|forklift|ipaf|pasma|iosh|nebosh|health and safety|manual handling|mental health|fire\w*|marshal\w*|warden\w*|food|hygiene|haccp|allergen\w*|aplh|alcohol|barista|coffee|marketing|social media|officers?|supervisors?|operators?|level\s*\d)\b/i;

// a review about Read Training in general: it names no course topic and no kind of course in its words
export const aboutUsOnly = (review) => !review.topic && !SUBJECT_WORDS.test(review.text);

// the reviews ticked for the home page, at most four
export const homeReviews = (reviews) => reviews.filter((r) => r.onHome).slice(0, HOME_MAX);

// the course a review names, as the catalogue calls it ("Door Supervisor"), or "" for a general one. Call after loadTaxonomy().
export const reviewCourse = (review) => {
  if (!review.topic) return "";
  const [c, s, t] = review.topic.split("/");
  return topicName(c, s, t);
};

// what a course page shows: the reviews that name this course's topic, or, when none does, the newest few about Read Training in
// general (aboutUsOnly; CourseReviews says so and links to all of them). Picked by their words and date only, never by their
// stars, so a lower rating is shown like any other (DMCC Act 2024).
export const reviewsForCourse = (reviews, course) => {
  const named = reviews.filter((r) => r.topic && matchesPick(course, r.topic));
  return named.length ? named : reviews.filter(aboutUsOnly).slice(0, GENERAL_MAX);
};

// Customer reviews, filtered to one course (its name as the filter shows it)
