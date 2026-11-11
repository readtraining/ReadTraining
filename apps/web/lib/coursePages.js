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

// the filters a page sets itself or doesn't show, which its address can't set either (lib/catalogueFilters.js parseCatalogueParams):
// a page without the filter panel takes none; otherwise its hidden groups, and a page for one sub-category its sub-category
const fixedFilters = (page) =>
  page.filters === false ? ["subject", "sub", "method", "level", "price"] : [...(page.hide || []), ...(page.select.sub ? ["sub"] : [])];

// "First aid training courses" in the middle of a sentence ("No first aid training courses near Leeds yet"); a name that starts
// with an abbreviation keeps its capitals (CITB Site Safety Plus)
export const midSentence = (title) => (/^[A-Z][a-z]/.test(title) ? title.charAt(0).toLowerCase() + title.slice(1) : title);

// a category with no written page: a plain one in the same shape
const categoryPage = (cat) => ({
  slug: cat.slug,
  label: `${cat.name} courses`,
  title: `${cat.name} courses`,
  description: `Compare ${cat.name.toLowerCase()} courses from approved UK training providers, with their dates, venues and prices.`,
  lead: `${cat.name} courses from approved training providers. Compare dates, venues and prices.`,
  select: { subject: cat.slug },
  hide: ["subject"],
  about: {
    title: `About ${cat.name.toLowerCase()} courses`,
    text: `Each course is run by an approved training provider and checked by our team before it goes live. Compare the providers' dates, venues and prices, and choose the one that suits you.`,
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
      // the other written pages, each only while it lists a live course
      links: coursePages.filter((p) => p.slug !== slug && select(courses, p.select).length > 0).map((p) => ({ label: p.label, href: coursePageHref(p.slug) })),
      subject: page.select.subject,
      method: page.select.method, // a method page's own way of study (a town page's location search counts only that one)
      hide: page.hide,
      fixed: fixedFilters(page),
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
  const towns = new Map();
  for (const c of select(courses, page.select).filter((c) => c.methods.includes("classroom"))) {
    for (const v of c.venues) {
      const t = towns.get(v.city) || { city: v.city, slug: townSlug(v.city), href: `${coursePageHref(slug)}/${townSlug(v.city)}`, lat: null, lng: null };
      if (t.lat == null && v.lat != null) Object.assign(t, { lat: v.lat, lng: v.lng });
      towns.set(v.city, t);
    }
  }
  return [...towns.values()].sort((a, b) => a.city.localeCompare(b.city));
}
export const getCourseTownParams = (courses) => getCoursePageSlugs().flatMap((slug) => getCourseTowns(slug, courses).map((t) => ({ slug, town: t.slug })));

// A course page narrowed to one town: the same catalogue with the town as its location, its own title and breadcrumb.
// A town with no venue for this page yet still has a page (an old link, or a town typed into the address): it says so and lists
// what is within reach or taken online (or, with nothing, its own empty state), instead of "page not found". It is kept out of search (`empty`) until a venue opens there. Only a
// real UK place gets one: `placeName` is its name from the map (lib/catalogueServer.js ukPlace), null when there is no such
// place (Islamabad: "page not found"), undefined when it couldn't be checked (the page shows, named from the address).
const TOWN_SLUG = /^[a-z]+(-[a-z]+){0,4}$/;
const townFromSlug = (town) => town.split("-").map((w) => (["upon", "on", "under", "le", "in"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
/** Whether a town page's town has a venue for this page (so no map check is needed). */
export const isCourseTown = (slug, town, courses) => getCourseTowns(slug, courses).some((t) => t.slug === town);
/** Whether a town page can exist without a venue there: the address looks like a town, and the page is one that has towns at all
 * (live online and self-paced pages have none), so nothing else is worth looking up on the map. */
export const mayBeTownPage = (slug, town) => TOWN_SLUG.test(town) && town.length <= 40 && !["live-online", "self-paced"].includes(definition(slug)?.select?.method);
export function getCourseTownPage(slug, town, courses, placeName) {
  const page = getCoursePage(slug, courses);
  if (!page) return null;
  const found = getCourseTowns(slug, courses).find((t) => t.slug === town);
  if (!found && (placeName === null || !mayBeTownPage(slug, town))) return null;
  const place = found || { city: placeName || townFromSlug(town), slug: town, href: `${coursePageHref(slug)}/${town}` };
  if (!place) return null;
  const title = `${page.title} in ${place.city}`;
  return {
    ...page,
    city: place.city,
    title,
    href: place.href,
    empty: !found,
    description: `Compare ${midSentence(page.title)} in ${place.city}: venues, dates, prices and approved providers in one place.`,
    scope: {
      ...page.scope,
      title,
      lead: found
        ? `Courses with a venue in or near ${place.city}, closest first. Change the town or postcode to look somewhere else.`
        : `There's no venue for these courses in ${place.city} yet. Change the town or postcode to look somewhere else.`,
      crumb: place.city,
      parent: { label: page.label, title: page.title, href: coursePageHref(slug) },
      location: place.city,
      none: `No ${midSentence(page.title)} near ${place.city} yet`,
      // the page's other towns: a location changed to one of them opens its page, any other the page's own (CourseCatalogue)
      towns: getCourseTowns(slug, courses).map(({ city, href, lat, lng }) => ({ city, href, lat, lng })),
    },
  };
}
