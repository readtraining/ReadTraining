import { LEVEL_ALIASES, METHOD_ALIASES, categoryName, getTaxonomy, subcategoriesOf } from "@/lib/taxonomy";

// The course search (/courses and the category, method and town pages): the filter groups, the sort options and the pure
// filter, sort and URL helpers. They read the shape lib/catalogueData.js toCatalogueCourse gives a listing:
// { id, title, description, subject, sub, methods[], level, venues[{ city, postcode, lat, lng }], providers, popularity,
//   addedAt (ISO date), price (pounds, or null with no dates yet), wasPrice?, duration }

export const PROJECT_NAME = "ReadTraining";
export const PAGE_SIZE = 6;

// The filter groups, built from the catalogue's one list (lib/taxonomy.js: categories, delivery methods and levels from the
// database). `key` is both the state key and the URL query key. Only the icons live here (how a method looks, not what it is).
const METHOD_ICONS = { classroom: "icon-online-learning-4", "live-online": "icon-online-learning-2", "self-paced": "icon-time-management" };
const LEVEL_ICONS = { beginner: "icon-book", intermediate: "icon-bar-chart", advanced: "icon-graduate-cap" };
export function catalogueFilterGroups(t = getTaxonomy()) {
  return [
    { key: "subject", label: "Subject", title: "Subjects", options: t.categories.map((c) => ({ value: c.slug, label: c.name })) },
    { key: "method", label: "Method of Study", title: "Methods of Study", options: t.methods.map((m) => ({ label: m.name, value: m.slug, icon: METHOD_ICONS[m.slug] || "icon-book" })) },
    { key: "level", label: "Course Level", title: "Course Levels", options: t.levels.map((l) => ({ label: l.name, value: l.slug, icon: LEVEL_ICONS[l.slug] || "icon-book" })) },
  ];
}

export const sortOptions = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

// Only offered while a location is entered; it is the default sort in that case.
export const closestSortOption = { value: "closest", label: "Closest" };
const allSortValues = [...sortOptions.map((o) => o.value), closestSortOption.value];

// --- location matching -------------------------------------------------------
const norm = (s) => s.toLowerCase().replace(/\s+/g, "");
const outward = (s) => s.trim().toLowerCase().split(/\s+/)[0];

// Courses with a physical venue match when a venue's town or postcode matches.
// Courses with no venue (online only) are available anywhere, so they always match.
export function matchesLocation(course, query) {
  const q = (query || "").trim();
  if (!q || course.venues.length === 0) return true;
  const qn = norm(q);
  const hasSpace = /\s/.test(q);
  return course.venues.some(
    (v) =>
      norm(v.city).includes(qn) ||
      norm(v.postcode).startsWith(qn) ||
      (hasSpace && outward(v.postcode) === outward(q)),
  );
}

// --- filtering / sorting -----------------------------------------------------
// Keyword matches title, subject and description, case-insensitive.
const matchesKeyword = (course, q) => {
  const needle = (q || "").trim().toLowerCase();
  if (!needle) return true;
  return [course.title, categoryName(course.subject), course.description].some((t) => (t || "").toLowerCase().includes(needle));
};

// Within this distance of where the learner is (a town or postcode found on the map), a classroom venue counts as near.
export const NEAR_KM = 50;
// A course is near `point` ({ lat, lng }) when one of its venues is within NEAR_KM; one with no venue (online) is near anywhere.
const nearPoint = (course, point) => course.venues.length === 0 || course.venues.some((v) => v.lat != null && distanceKm(point, v) <= NEAR_KM);

// subject, sub, method and level are arrays of ticked values. Inside a group a course matches ANY ticked value (OR);
// between groups every group must match (AND). An empty array means "no filter" for that group. The price slider's ends mean
// "no limit" (a course dearer than the slider still shows until a top price is set); a course with no price yet (no dates)
// shows unless a price range is set. `point`: where the typed location is on the map (catalogue.locate), when found; without it
// the location matches a venue's town or postcode by its words.
export function filterCourses(courses, { subject = [], sub = [], method = [], level = [], location, min, max, q }, point = null) {
  const low = min !== undefined && min > PRICE_BOUNDS.min;
  const high = max !== undefined && max < PRICE_BOUNDS.max;
  return courses.filter(
    (course) =>
      matchesKeyword(course, q) &&
      (!subject.length || subject.includes(course.subject)) &&
      (!sub.length || sub.includes(course.sub)) &&
      (!method.length || course.methods.some((m) => method.includes(m))) &&
      (!level.length || level.includes(course.level)) &&
      (!low || (course.price != null && course.price >= min)) &&
      (!high || (course.price != null && course.price <= max)) &&
      (point && location ? nearPoint(course, point) : matchesLocation(course, location)),
  );
}

// a course with no price yet goes last either way
const priceOr = (c, none) => (c.price == null ? none : c.price);
const sorters = {
  "price-asc": (a, b) => priceOr(a, Infinity) - priceOr(b, Infinity),
  "price-desc": (a, b) => priceOr(b, -Infinity) - priceOr(a, -Infinity),
  popular: (a, b) => b.popularity - a.popularity,
  // most recently added first (addedAt is an ISO date); same day: the more popular first
  newest: (a, b) => (b.addedAt || "").localeCompare(a.addedAt || "") || b.popularity - a.popularity,
  name: (a, b) => a.title.localeCompare(b.title, "en-GB", { sensitivity: "base" }),
};

// Distance in km (equirectangular approximation is plenty for ranking UK venues).
const distanceKm = (a, b) => {
  const x = ((b.lng - a.lng) * Math.PI / 180) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  const y = (b.lat - a.lat) * Math.PI / 180;
  return Math.sqrt(x * x + y * y) * 6371;
};

// Reference point for "closest": the first venue that matches the typed town or postcode.
function locationPoint(courses, location) {
  for (const course of courses) {
    const v = course.venues.find((venue) => matchesLocation({ venues: [venue] }, location));
    if (v) return v;
  }
  return null;
}

export function sortCourses(courses, sort, location = "", all = courses, found = null) {
  if (sort === "closest") {
    const point = found || locationPoint(all, location);
    if (!point) return sorters.popular ? [...courses].sort(sorters.popular) : courses;
    const dist = (c) => (c.venues.some((v) => v.lat != null) ? Math.min(...c.venues.filter((v) => v.lat != null).map((v) => distanceKm(point, v))) : Infinity);
    return [...courses].sort((a, b) => dist(a) - dist(b) || b.popularity - a.popularity);
  }
  const fn = sorters[sort];
  return fn ? [...courses].sort(fn) : courses;
}

// The price slider runs from £0 to £1,500; its ends mean "no limit", so a dearer course still shows until a top price is set.
export const PRICE_BOUNDS = { min: 0, max: 1500 };
export const PRICE_STEP = 5;

// Quick price bands. A band is "selected" when min/max equal its range, so typing a range or moving the
// slider deselects it, and picking a band overwrites min/max (no extra URL param).
export const priceBands = [
  { value: "any", label: "Any price", min: PRICE_BOUNDS.min, max: PRICE_BOUNDS.max },
  { value: "under-50", label: "Under £50", min: PRICE_BOUNDS.min, max: 49.99 },
  { value: "50-200", label: "£50 to £200", min: 50, max: 200 },
  { value: "over-200", label: "Over £200", min: 200.01, max: PRICE_BOUNDS.max },
];

export const defaultSort = (location) => (location ? "closest" : "popular");

// --- URL state -----------------------------------------------------------------
// `base` is a course page's fixed choice ({ subject }: /courses/first-aid). Its sub-subjects are valid without ?subject=.
export function parseCatalogueParams(params, base = {}) {
  const [subjectG, methodG, levelG] = catalogueFilterGroups();
  const sort = params.get("sort");
  const page = parseInt(params.get("page") || "1", 10);
  // a town page (/courses/<page>/<town>) sets the town as `base.location`; ?location= (even empty) overrides it
  const raw = params.has("location") ? params.get("location") : params.get("where") || base.location || "";
  const location = raw.trim().slice(0, 80);
  const num = (key, fallback) => {
    const n = parseFloat(params.get(key));
    return Number.isFinite(n) ? Math.min(Math.max(n, PRICE_BOUNDS.min), PRICE_BOUNDS.max) : fallback;
  };
  let min = num("min", PRICE_BOUNDS.min);
  let max = num("max", PRICE_BOUNDS.max);
  if (min > max) [min, max] = [max, min];

  // Checkbox groups hold several values: ?subject=first-aid,security. Unknown values are dropped, duplicates removed
  // and the rest sorted, so the same selection always makes the same URL.
  const many = (key, allowed, map = (v) => v) =>
    [...new Set((params.get(key) || "").split(",").map((v) => map(v.trim().toLowerCase())).filter((v) => allowed.has(v)))].sort();
  const subject = many("subject", new Set(subjectG.options.map((o) => o.value)));
  const allowedSubs = new Set([...subject, ...(base.subject ? [base.subject] : [])].flatMap((sv) => subcategoriesOf(sv).map((x) => x.slug)));
  return {
    subject,
    sub: many("sub", allowedSubs),
    method: many("method", new Set(methodG.options.map((o) => o.value)), (v) => METHOD_ALIASES[v] || v),
    level: many("level", new Set(levelG.options.map((o) => o.value)), (v) => LEVEL_ALIASES[v] || v),
    q: (params.get("q") || "").trim().slice(0, 80),
    location,
    min,
    max,
    sort: allSortValues.includes(sort) && (sort !== "closest" || location) ? sort : defaultSort(location),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// Defaults are omitted so URLs stay clean. `base` as for parseCatalogueParams.
export function buildCatalogueQuery(state, base = {}) {
  const p = new URLSearchParams();
  const list = (key, values) => values && values.length && p.set(key, [...new Set(values)].sort().join(","));
  list("subject", state.subject);
  if ((state.subject && state.subject.length) || base.subject) list("sub", state.sub);
  list("method", state.method);
  list("level", state.level);
  if (state.q) p.set("q", state.q);
  if ((state.location || "") !== (base.location || "")) p.set("location", state.location || "");
  if (state.min > PRICE_BOUNDS.min) p.set("min", String(state.min));
  if (state.max < PRICE_BOUNDS.max) p.set("max", String(state.max));
  if (state.sort && state.sort !== defaultSort(state.location)) p.set("sort", state.sort);
  if (state.page > 1) p.set("page", String(state.page));
  return p.toString().replace(/%2C/g, ","); // keep the commas readable
}
