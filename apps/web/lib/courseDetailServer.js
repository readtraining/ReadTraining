import { toCourseDetail } from "@/lib/catalogueData";
import { loadListings } from "@/lib/catalogueServer";
import { mockTestFor } from "@/lib/testPrep";
import { reviewCourse, reviewsForCourse } from "@/lib/siteReviews";
import { loadReviews } from "@/lib/siteReviewsServer";
import { loadSiteContent } from "@/lib/siteContentServer";

// Server only: everything the course page (components/courseDetail/CourseDetail) needs, from a course page's data (API
// catalogue.course, or the editors' provider.courses.preview / admin.courses.preview): up to three more courses from its category,
// its free mock test when it has one (lib/testPrep.js), and the published reviews that name its topic. The public page
// (/course/<slug>) and the editors' Preview use this one function, so the preview is the page learners will see.
export async function courseDetailFor(page) {
  // the site content too: the hero's rating line reads the trust numbers (trustFigures)
  const [listings, all] = await Promise.all([loadListings(), loadReviews(), loadSiteContent()]);
  const related = listings.filter((l) => l.slug !== page.slug && l.slug !== page.parent?.slug && l.category && l.category === page.category).slice(0, 3);
  const detail = toCourseDetail(page, related);
  const course = { ...detail, mockTest: mockTestFor(detail) };
  const reviews = reviewsForCourse(all, course).map((r) => ({ ...r, course: reviewCourse(r) }));
  return { course, reviews, reviewsCourse: reviews[0]?.course || "" };
}
