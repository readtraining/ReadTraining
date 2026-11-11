import { CATALOGUE_HREF, coursePath } from "@/lib/routes";

// The site's navigation from the live catalogue (API catalogue.nav): the subjects, delivery methods, towns and courses every
// menu, the footer, the home page's subject tiles and search read, so a subject added in admin › Catalogue settings shows up
// everywhere once it has a live course, a retired or empty one goes, the towns are the real venues' and no link leads to an
// empty search. The server loads it (lib/catalogueServer.js loadNav) and the root layout hands it to the browser
// (lib/navContext.js useNav); `withLinks` adds each entry's address.

export const EMPTY_NAV = { subjects: [], methods: [], towns: [], courses: [] };

// a subject's outline icon (components/header/navIcons.jsx); a new subject gets the book
const SUBJECT_ICONS = {
  "accounting-and-finance": "calculator",
  business: "briefcase",
  construction: "helmet",
  "first-aid": "aid",
  "health-and-care": "heart",
  "health-and-safety": "warning",
  hospitality: "food",
  lifestyle: "sparkle",
  marketing: "megaphone",
  "personal-development": "growth",
  security: "shield",
  "teaching-and-academics": "cap",
};
// the header writes "and" as "&" in subject names (as Teaching & Academics), so none of them breaks onto two lines
export const shortName = (name) => name.replace(/ and /g, " & ");
// a course's short name in the footer and the header menu: its title without the bracketed detail ("Personal Licence (Level
// 2 Award …)" → "Personal Licence"), keeping an acronym with its body ("CITB Site Management Safety Training Scheme (SMSTS)"
// → "CITB SMSTS")
export const shortCourseName = (title) => {
  const m = title.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m) return title;
  const [, base, inner] = m;
  const body = base.split(" ")[0];
  return /^[A-Z0-9]{2,8}$/.test(inner) && /^[A-Z]{2,6}$/.test(body) ? `${body} ${inner}` : base;
};
export const cityHref = (town) => `${CATALOGUE_HREF}?location=${encodeURIComponent(town)}`;

// every entry with its address: a subject's page (/courses/<slug>, one for every category), a method's own page when it has one
// (`methodPages`, the method pages in data/coursePages.js) or the search filtered to it, a town's search, a course's page
export function withLinks(nav, methodPages = []) {
  const n = nav?.subjects ? nav : EMPTY_NAV;
  return {
    subjects: n.subjects.map((s) => ({ ...s, label: shortName(s.name), icon: SUBJECT_ICONS[s.slug] || "book", href: `${CATALOGUE_HREF}/${s.slug}` })),
    methods: n.methods.map((m) => ({ ...m, href: methodPages.includes(m.slug) ? `${CATALOGUE_HREF}/${m.slug}` : `${CATALOGUE_HREF}?method=${m.slug}` })),
    towns: n.towns.map((t) => ({ ...t, href: cityHref(t.name) })),
    courses: n.courses.map((c) => ({ ...c, href: coursePath(c.slug) })),
  };
}

// a course chosen in "Find a course near you", in a town: the search for that course there (it lists that town's dates first)
export const courseInTown = (course, town) => `${CATALOGUE_HREF}?q=${encodeURIComponent(course.title)}&location=${encodeURIComponent(town)}`;
// a subject's name by its slug, for a course's subject line
export const subjectName = (nav, slug) => nav.subjects.find((s) => s.slug === slug)?.label ?? "";
