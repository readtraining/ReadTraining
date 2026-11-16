import { toCourseDetail } from "@/lib/catalogueData";
import { loadListings } from "@/lib/catalogueServer";
import { mockTestFor } from "@/lib/testPrep";
import { reviewCourse, reviewPlace } from "@/lib/siteReviews";
import { loadCourseReviews } from "@/lib/siteReviewsServer";
import { loadSiteContent } from "@/lib/siteContentServer";

// Server only: everything the course page (components/courseDetail/CourseDetail) needs, from a course page's data (API
// catalogue.course, or the editors' provider.courses.preview / admin.courses.preview): up to three more courses from its category,
// its free mock test when it has one (lib/testPrep.js), and the first page of its reviews (API content.courseReviews: the
// published reviews that name its topic, or, when none does, a few general ones), with `topic` for the browser to ask for the
// other pages and `course`, the topic's name; null when there are none at all. The public page (/course/<slug>) and the
// editors' Preview use this one function, so the preview is the page learners will see.
export async function courseDetailFor(page) {
  const topic = reviewPlace(page.category, page.subcategory, page.topic);
  // the site content too: the hero's rating line reads the trust numbers (trustFigures)
  const [listings, first] = await Promise.all([loadListings(), loadCourseReviews(topic), loadSiteContent()]);
  const related = listings.filter((l) => l.slug !== page.slug && l.slug !== page.parent?.slug && l.category && l.category === page.category).slice(0, 3);
  const detail = toCourseDetail(page, related);
  const course = { ...detail, mockTest: mockTestFor(detail) };
  const reviews = first?.total ? { ...first, topic, course: first.general ? "" : reviewCourse(first.items[0]) } : null;
  return { course, reviews };
}
