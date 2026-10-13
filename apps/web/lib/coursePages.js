import { coursePages } from "@/data/coursePages";
import { catalogueCourses } from "@/data/courseCatalogue";
import { getPostCards } from "@/lib/blog";
import { CATALOGUE_HREF } from "@/lib/routes";

// Reads for the course pages (/courses/[slug]), server side. Swap the course selection for an API query later.

export const COURSES_HREF = CATALOGUE_HREF;
export const coursePageHref = (slug) => `${COURSES_HREF}/${slug}`;

const select = ({ method, subject, ids }) => {
  if (method) return catalogueCourses.filter((c) => c.methods.includes(method));
  if (subject) return catalogueCourses.filter((c) => c.subject === subject);
  return ids.map((id) => catalogueCourses.find((c) => c.id === id)).filter(Boolean);
};

export const getCoursePageSlugs = () => coursePages.map((p) => p.slug);

export function getCoursePage(slug) {
  const page = coursePages.find((p) => p.slug === slug);
  if (!page) return null;
  const courses = select(page.select);
  return {
    ...page,
    href: coursePageHref(page.slug),
    courses,
    // what CourseCatalogue reads to become this page
    scope: {
      title: page.title,
      lead: page.lead,
      crumb: page.label,
      allHref: CATALOGUE_HREF,
      links: coursePages.filter((p) => p.slug !== slug).map((p) => ({ label: p.label, href: coursePageHref(p.slug) })),
      subject: page.select.subject,
      hide: page.hide,
      filters: page.filters !== false,
      about: page.about,
    },
    guides: page.blog ? getPostCards().filter((p) => p.category.key === page.blog) : [],
  };
}

// ---- town pages (/courses/<page>/<town>, as hurak.com/courses/first-aid/nottingham) ------------------------------------------
// The towns where a page's classroom courses have a venue. Live online and self-paced pages have no towns.
const townSlug = (city) => city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function getCourseTowns(slug) {
  const page = coursePages.find((p) => p.slug === slug);
  if (!page || (page.select.method && page.select.method !== "classroom")) return [];
  const cities = select(page.select).filter((c) => c.methods.includes("classroom")).flatMap((c) => c.venues.map((v) => v.city));
  return [...new Set(cities)].sort().map((city) => ({ city, slug: townSlug(city), href: `${coursePageHref(slug)}/${townSlug(city)}` }));
}
export const getCourseTownParams = () => coursePages.flatMap((p) => getCourseTowns(p.slug).map((t) => ({ slug: p.slug, town: t.slug })));

// A course page narrowed to one town: the same catalogue with the town as its location, its own title and breadcrumb.
export function getCourseTownPage(slug, town) {
  const page = getCoursePage(slug);
  const place = getCourseTowns(slug).find((t) => t.slug === town);
  if (!page || !place) return null;
  const what = page.label.replace(/ courses$/i, "");
  const title = `${what} courses in ${place.city}`;
  return {
    ...page,
    city: place.city,
    title,
    href: place.href,
    description: `Compare ${what.toLowerCase()} courses in ${place.city}: venues, dates, prices and approved providers in one place.`,
    scope: {
      ...page.scope,
      title,
      lead: `Courses with a venue in ${place.city}, closest first. Change the town or postcode to look somewhere else.`,
      crumb: place.city,
      parent: { label: page.label, href: coursePageHref(slug) },
      location: place.city,
    },
  };
}
