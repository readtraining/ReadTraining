import { SITE_URL } from "@/lib/seo";
import { getPostSlugs } from "@/lib/blog";
import { getCoursePage, getCoursePageSlugs, getCourseTownParams } from "@/lib/coursePages";
import { getHelpArticleSlugs, getHelpTopicSlugs } from "@/lib/help";
import { getLicenceSlugs } from "@/lib/licences";
import { getProviderDirectory } from "@/lib/publicProvider";
import { getSubjectSlugs } from "@/lib/testPrep";
import { centreParams } from "@/lib/hseTest";
import { loadCatalogue } from "@/lib/catalogueServer";
import { loadTaxonomy } from "@/lib/taxonomyServer";
import { coursePath } from "@/lib/routes";
import { getLegalDocument, getLegalList } from "@/lib/legal";
import { loadSiteContent } from "@/lib/siteContentServer";
import { loadReviews } from "@/lib/siteReviewsServer";

// /sitemap.xml: every public page (the same lists the pages build from), so search engines find them all. Private areas
// (account, business, provider, admin, basket, checkout) are left out (see robots.js). A legal page
// still marked as a draft (not yet reviewed by a solicitor) asks search engines not to index it, so it is left out too: listing
// it would contradict that (Search Console reports "Submitted URL marked noindex").
const STATIC = [
  "/", "/courses", "/for-business", "/for-providers", "/about-us", "/contact-us", "/customer-reviews", "/certificate-checker",
  "/security-jobs", "/skill-saver", "/provider-skill-saver", "/licences", "/test-prep", "/tests/citb-health-safety-and-environment-test",
  "/cscs-test-centres", "/providers", "/blog", "/help-centre", "/quote", "/terms-and-conditions", "/privacy-policy", "/cookie-policy", "/provider-terms",
  "/accessibility-statement",
];

export default async function sitemap() {
  await Promise.all([loadTaxonomy(), loadSiteContent()]);
  const courses = await loadCatalogue();
  const drafts = new Set(getLegalList().filter((d) => getLegalDocument(d.slug)?.draft).map((d) => d.href));
  const paths = [
    ...STATIC,
    ...courses.map((c) => coursePath(c.slug)),
    // only the course pages with a live course (an empty one asks search engines not to index it)
    ...getCoursePageSlugs().filter((s) => getCoursePage(s, courses)?.courses.length).map((s) => `/courses/${s}`),
    ...getCourseTownParams(courses).map((p) => `/courses/${p.slug}/${p.town}`),
    ...getLicenceSlugs().map((s) => `/licences/${s}`),
    ...getSubjectSlugs().map((s) => `/test-prep/${s}`),
    ...centreParams().map((s) => `/tests-locations/${s}`),
    ...(await getProviderDirectory()).map((p) => `/providers/${p.slug}`),
    ...getPostSlugs().map((s) => `/blog/${s}`),
    ...getHelpTopicSlugs().map((p) => `/help-centre/${p.topic}`),
    ...getHelpArticleSlugs().map((p) => `/help-centre/${p.topic}/${p.article}`),
  ];
  // Customer reviews is hidden (404) until a review is published
  if (!(await loadReviews()).length) drafts.add("/customer-reviews");
  return [...new Set(paths)].filter((path) => !drafts.has(path)).map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: path === "/" ? "daily" : "weekly", priority: path === "/" ? 1 : 0.7 }));
}
