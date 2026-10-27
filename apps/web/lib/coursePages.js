import { coursePages } from "@/data/coursePages";
import { getPostCards } from "@/lib/blog";
import { CATALOGUE_HREF } from "@/lib/routes";
import { getTaxonomy } from "@/lib/taxonomy";

// Reads for the course pages (/courses/[slug] and their town pages), server side. `courses` is the real catalogue (every live
// listing, lib/catalogueServer.js loadListings, as lib/catalogueData.js toCatalogueCourse), which each page narrows to its own:
// a study method, a category, or one sub-category. The pages written in data/coursePages.js keep their own words; every other
// category of the catalogue list gets a plain page at its slug, so each subject in the menus has a page. The category names
// come from the catalogue list (await loadTaxonomy() first).

export const COURSES_HREF = CATALOGUE_HREF;
export const coursePageHref = (slug) => `${COURSES_HREF}/${slug}`;

const select = (courses, { method, subject, sub }) =>
  courses.filter((c) => (!method || c.methods.includes(method)) && (!subject || c.subject === subject) && (!sub || c.sub === sub));

// a category with no written page: a plain one in the same shape
const categoryPage = (cat) => ({
  slug: cat.slug,
  label: `${cat.name} courses`,
  title: `${cat.name} courses`,
  description: `Compare ${cat.name.toLowerCase()} courses from approved UK training providers: classroom, live online and self-paced, with their dates and prices.`,
  lead: `Every ${cat.name.toLowerCase()} course on ReadTraining, from approved training providers. Compare dates, places and prices.`,
  select: { subject: cat.slug },
  hide: ["subject"],
  about: {
    title: `About ${cat.name.toLowerCase()} courses`,
    text: `Each course is run by an approved training provider and checked by our team before it goes live. Compare the providers' dates, venues and prices, then book the one that suits you.`,
  },
  faq: [],
});

const definition = (slug) => {
  const written = coursePages.find((p) => p.slug === slug);
  if (written) return written;
  const cat = getTaxonomy().categories.find((c) => c.slug === slug);
  return cat ? categoryPage(cat) : null;
};

// the written pages, then every category that has none
export const getCoursePageSlugs = () => [...coursePages.map((p) => p.slug), ...getTaxonomy().categories.map((c) => c.slug).filter((s) => !coursePages.some((p) => p.slug === s))];

export function getCoursePage(slug, courses) {
  const page = definition(slug);
  if (!page) return null;
  return {
    ...page,
    href: coursePageHref(page.slug),
    courses: select(courses, page.select),
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
// The towns where a page's courses have a classroom venue. Live online and self-paced pages have no towns.
const townSlug = (city) => city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function getCourseTowns(slug, courses) {
  const page = definition(slug);
  if (!page || (page.select.method && page.select.method !== "classroom")) return [];
  const cities = select(courses, page.select).filter((c) => c.methods.includes("classroom")).flatMap((c) => c.venues.map((v) => v.city));
  return [...new Set(cities)].sort().map((city) => ({ city, slug: townSlug(city), href: `${coursePageHref(slug)}/${townSlug(city)}` }));
}
export const getCourseTownParams = (courses) => getCoursePageSlugs().flatMap((slug) => getCourseTowns(slug, courses).map((t) => ({ slug, town: t.slug })));

// A course page narrowed to one town: the same catalogue with the town as its location, its own title and breadcrumb.
export function getCourseTownPage(slug, town, courses) {
  const page = getCoursePage(slug, courses);
  const place = getCourseTowns(slug, courses).find((t) => t.slug === town);
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
      lead: `Courses with a venue in or near ${place.city}, closest first. Change the town or postcode to look somewhere else.`,
      crumb: place.city,
      parent: { label: page.label, href: coursePageHref(slug) },
      location: place.city,
    },
  };
}
