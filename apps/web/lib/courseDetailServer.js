import { pickCourses, toCourseDetail } from "@/lib/catalogueData";
import { loadCatalogue, loadListings } from "@/lib/catalogueServer";
import { TOPICS } from "@/data/courseTopics";
import { mockTestFor } from "@/lib/testPrep";
import { reviewCourse, reviewPlace } from "@/lib/siteReviews";
import { loadCourseReviews } from "@/lib/siteReviewsServer";
import { loadSiteContent } from "@/lib/siteContentServer";
import { licenceFees, teamTrainingContent } from "@/lib/siteContent";

// A guide's parts that come from elsewhere, never typed in it: the team training section's words (Site content, `business`:
// switched on), the licence fee its cost table adds (`costs.licenceFee.fee`: one of the site's fees, by its key; a fee no longer
// in the list leaves its row out), and its first aid row's price: the lowest live price of Emergency First Aid at Work
// (`firstAidFrom`, from the catalogue; none live: the row is left out). Call after loadSiteContent().
function withSiteParts(guide, firstAidFrom) {
  if (!guide) return guide;
  const out = { ...guide };
  if (guide.business) out.business = teamTrainingContent();
  else delete out.business;
  if (guide.costs) {
    const { licenceFee: want, firstAid, ...costs } = guide.costs;
    const fee = want && licenceFees().find((f) => f.key === want.fee);
    out.costs = {
      ...costs,
      ...(firstAid && firstAidFrom != null ? { firstAid: { label: firstAid.label, from: firstAidFrom } } : {}),
      ...(fee ? { licenceFee: { label: want.label || fee.name, amount: fee.amount } } : {}),
    };
  }
  return out;
}

// Server only: everything the course page (components/courseDetail/CourseDetail) needs, from a course page's data (API
// catalogue.course, or the editors' provider.courses.preview / admin.courses.preview): up to three more courses from its category,
// its free mock test when it has one (lib/testPrep.js), and the first page of its reviews (API content.courseReviews: the
// published reviews that name its topic, or, when none does, a few general ones), with `topic` for the browser to ask for the
// other pages and `course`, the topic's name; null when there are none at all. The public page (/course/<slug>) and the
// editors' Preview use this one function, so the preview is the page learners will see.
export async function courseDetailFor(page) {
  const topic = reviewPlace(page.category, page.subcategory, page.topic);
  // the site content too: the hero's rating line reads the trust numbers (trustFigures)
  const [listings, first, , catalogue] = await Promise.all([loadListings(), loadCourseReviews(topic), loadSiteContent(), loadCatalogue()]);
  // the cost table's first aid row: the lowest live price of Emergency First Aid at Work
  const aidPrices = pickCourses(catalogue, [TOPICS.efaw], Infinity).map((c) => c.price).filter((p) => p != null);
  const related = listings.filter((l) => l.slug !== page.slug && l.slug !== page.parent?.slug && l.category && l.category === page.category).slice(0, 3);
  const detail = toCourseDetail(page, related);
  const course = { ...detail, guide: withSiteParts(detail.guide, aidPrices.length ? Math.min(...aidPrices) : null), mockTest: mockTestFor(detail) };
  const reviews = first?.total ? { ...first, topic, course: first.general ? "" : reviewCourse(first.items[0]) } : null;
  return { course, reviews };
}
