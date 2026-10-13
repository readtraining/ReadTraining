import { SITE_URL } from "@/lib/seo";
import { courseLink } from "@/data/courseSlugs";
import { getPostSlugs } from "@/lib/blog";
import { getCoursePageSlugs, getCourseTownParams } from "@/lib/coursePages";
import { getHelpArticleSlugs, getHelpTopicSlugs } from "@/lib/help";
import { getLicenceSlugs } from "@/lib/licences";
import { getProviderSlugs } from "@/lib/providers";
import { getSubjectSlugs } from "@/lib/testPrep";
import { centreParams } from "@/lib/hseTest";
import { locationCourses, slugify } from "@/data/home/menu";
import { getCourseLocation } from "@/lib/courseLocations";
import { catalogueCourses } from "@/data/courseCatalogue";

// /sitemap.xml: every public page (the same lists the pages build from), so search engines find them all. Private areas
// (account, business, provider, admin, basket, checkout) and the template's demo pages are left out (see robots.js).
const STATIC = [
  "/", "/courses", "/for-business", "/for-providers", "/about-us", "/contact-us", "/customer-reviews", "/certificate-checker",
  "/security-jobs", "/skill-saver", "/provider-skill-saver", "/licences", "/test-prep", "/tests/citb-health-safety-and-environment-test",
  "/cscs-test-centres", "/providers", "/blog", "/help-centre", "/quote", "/terms-and-conditions", "/privacy-policy", "/cookie-policy",
  "/accessibility-statement",
];

export default function sitemap() {
  const paths = [
    ...STATIC,
    ...catalogueCourses.map((c) => courseLink(c.id)),
    ...getCoursePageSlugs().map((s) => `/courses/${s}`),
    ...getCourseTownParams().map((p) => `/courses/${p.slug}/${p.town}`),
    // a course in a town only when it has a venue there (the others redirect to the course finder)
    ...locationCourses.filter((c) => c.id).flatMap((c) => (c.places || []).map((city) => `${c.locationSlug}-in-${slugify(city)}`))
      .filter((slug) => getCourseLocation(slug)?.venues.length)
      .map((slug) => `/course-locations/${slug}`),
    ...getLicenceSlugs().map((s) => `/licences/${s}`),
    ...getSubjectSlugs().map((s) => `/test-prep/${s}`),
    ...centreParams().map((s) => `/tests-locations/${s}`),
    ...getProviderSlugs().map((s) => `/providers/${s}`),
    ...getPostSlugs().map((s) => `/blog/${s}`),
    ...getHelpTopicSlugs().map((p) => `/help-centre/${p.topic}`),
    ...getHelpArticleSlugs().map((p) => `/help-centre/${p.topic}/${p.article}`),
  ];
  return [...new Set(paths)].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: path === "/" ? "daily" : "weekly", priority: path === "/" ? 1 : 0.7 }));
}
