import { LEVEL_ALIASES, METHOD_ALIASES, categoryName, getTaxonomy, subcategoriesOf, subcategoryName, topicName } from "@/lib/taxonomy";

// The course search (/courses and the category, method and town pages): the filter groups, the sort options and the pure
// filter, sort and URL helpers. They read the shape lib/catalogueData.js toCatalogueCourse gives a listing:
// { id, title, description, subject, sub, methods[], level, venues[{ city, postcode, lat, lng }], providers, popularity,
//   addedAt (ISO date), price (pounds, or null with no dates yet), wasPrice?, prices[{ method, venue, price, wasPrice }], duration }

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
const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, "");
const outward = (s) => (s || "").trim().toLowerCase().split(/\s+/)[0];
// what a typed location is: a postcode area on its own (L, LS), an outward code (L1, LS10), a full postcode, or a town's name
const AREA = /^[a-z]{1,2}$/i;
const OUTCODE = /^[a-z]{1,2}\d[a-z\d]?$/i;
const FULL = /^[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}$/i;
const areaOf = (postcode) => (/^[a-z]{1,2}/i.exec(postcode || "")?.[0] || "").toLowerCase();

// A course can be taken from anywhere when it runs without a venue (live online, self-paced), even if it also has classroom
// dates somewhere else. A classroom-only course needs a venue near the place; with no dates yet it has none, so a location
// search leaves it out. `methods`: the ways of study asked for (ticked, or the page's own, as /courses/classroom/leeds): only
// those count, so a classroom search near Leeds doesn't list a course because it also runs online.
export const takenAnywhere = (course, methods = []) =>
  (course.methods || []).some((m) => m !== "classroom" && (!methods.length || methods.includes(m)));

// A venue is in the typed place by its words (used until the place is found on the map, or when it can't be): one or two
// letters are a postcode area (L is Liverpool's, not every town starting with L), an outward code or a full postcode matches
// the venue's outward code, and anything else is a town matched from the start of its name ("leed" finds Leeds, "ford" not
// Stafford).
function venueMatches(venue, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return false;
  if (AREA.test(q)) return areaOf(venue.postcode) === q;
  if (FULL.test(q)) return outward(venue.postcode) === q.replace(/\s+/g, "").slice(0, -3);
  if (OUTCODE.test(q)) return outward(venue.postcode) === q;
  return norm(venue.city).startsWith(norm(q));
}
/** One of the course's venues is in the typed town, postcode area or postcode (see venueMatches). */
export const venueIn = (course, query) => course.venues.some((v) => venueMatches(v, query));

// A course matches a location when a venue is there, or when it can be taken online from anywhere.
export function matchesLocation(course, query, methods = []) {
  const q = (query || "").trim();
  return !q || takenAnywhere(course, methods) || venueIn(course, q);
}

// --- keyword search ------------------------------------------------------------
// Every word typed must be found in the course's title, subject, sub-subject, topic or summary (or be the initials of its title
// or topic: "efaw" is Emergency First Aid at Work). Words that say nothing about which course (course, training, and) are left
// out and a hyphen is a space ("first-aid"). A short word (three letters or fewer) must be a whole word, so "SIA" doesn't find
// "Asia" and "aid" doesn't find "paid"; a longer one matches the start of a word ("supervis" finds Supervisor).
const FILLER = new Set(["course", "courses", "training", "and"]);
const SMALL = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "the", "to"]);
const plain = (t) => (t || "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const initials = (t) => {
  const w = plain(t).split(" ").filter(Boolean);
  return [w.map((x) => x[0]).join(""), w.filter((x) => !SMALL.has(x)).map((x) => x[0]).join("")];
};
const searchText = new WeakMap();
function textOf(course) {
  if (!searchText.has(course)) {
    const topic = topicName(course.subject, course.sub, course.topic);
    searchText.set(course, {
      words: ` ${plain([course.title, categoryName(course.subject), subcategoryName(course.subject, course.sub), topic, course.description].join(" "))} `,
      initials: new Set([...initials(course.title), ...(topic ? initials(topic) : [])].filter((x) => x.length > 1)),
    });
  }
  return searchText.get(course);
}
export const matchesKeyword = (course, q) => {
  const words = plain(q).split(" ").filter((w) => w && !FILLER.has(w));
  if (!words.length) return true;
  const text = textOf(course);
  return words.every((w) => text.initials.has(w) || text.words.includes(w.length <= 3 ? ` ${w} ` : ` ${w}`));
};

// Within this distance of where the learner is (a town or postcode found on the map), a classroom venue counts as near.
export const NEAR_KM = 50;
const venueNear = (venue, point) => venue.lat != null && distanceKm(point, venue) <= NEAR_KM;
// A course is near `point` ({ lat, lng }) when one of its venues is within NEAR_KM, or it can be taken online (anywhere).
const nearPoint = (course, point, methods = []) => takenAnywhere(course, methods) || course.venues.some((v) => venueNear(v, point));

// --- the "From" price where the visitor is looking ---------------------------------
// The cheapest price the course can be booked at under the search's ways of study and place: a classroom page counts only
// classroom dates, a town only venues near it (or, until it is found on the map, matching its words) and what is taken online,
// and a self-paced price only when self-paced counts. The card, the price filter and the price sort all read it. Null when none.
function priceWhere(course, method, location, point) {
  const loc = (location || "").trim();
  let best = null;
  for (const p of course.prices || []) {
    if (method.length && !method.includes(p.method)) continue;
    const venue = p.venue == null ? null : course.venues[p.venue];
    if (loc && p.method === "classroom" && !(venue && (point ? venueNear(venue, point) : venueMatches(venue, loc)))) continue;
    if (!best || p.price < best.price) best = p;
  }
  return best;
}

// --- filtering / sorting -----------------------------------------------------
// subject, sub, method and level are arrays of ticked values. Inside a group a course matches ANY ticked value (OR);
// between groups every group must match (AND). An empty array means "no filter" for that group. The price slider's ends mean
// "no limit" (a course dearer than the slider still shows until a top price is set); a course with no price yet (no dates)
// shows unless a price range is set. `point`: where the typed location is on the map (catalogue.locate), when found; without it
// the location matches a venue's town or postcode by its words. Each course comes back with its price where the visitor is
// looking (priceWhere): `price`, `wasPrice` and `priceMethod`, the way of study of that price.
export function filterCourses(courses, { subject = [], sub = [], method = [], level = [], location, min, max, q }, point = null) {
  const low = min !== undefined && min > PRICE_BOUNDS.min;
  const high = max !== undefined && max < PRICE_BOUNDS.max;
  return courses
    .filter(
      (course) =>
        matchesKeyword(course, q) &&
        (!subject.length || subject.includes(course.subject)) &&
        (!sub.length || sub.includes(course.sub)) &&
        (!method.length || course.methods.some((m) => method.includes(m))) &&
        (!level.length || level.includes(course.level)) &&
        (point && location ? nearPoint(course, point, method) : matchesLocation(course, location, method)),
    )
    .map((course) => {
      const p = priceWhere(course, method, location, point);
      return { ...course, price: p?.price ?? null, wasPrice: p?.wasPrice ?? null, priceMethod: p?.method ?? null };
    })
    .filter((course) => (!low || (course.price != null && course.price >= min)) && (!high || (course.price != null && course.price <= max)));
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

// The course's venue nearest `point`, with how far it is ({ km, city }); null when it has no venue on the map.
export function nearestVenue(course, point) {
  if (!point) return null;
  let best = null;
  for (const v of course.venues) {
    if (v.lat == null) continue;
    const km = distanceKm(point, v);
    if (!best || km < best.km) best = { km, city: v.city };
  }
  return best;
}

// "About 12 miles away, Leeds" (UK distances in miles; under a mile says so)
export function distanceLabel(near) {
  const miles = near.km * 0.621371;
  const town = near.city ? `, ${near.city}` : "";
  return miles < 1 ? `Less than a mile away${town}` : `About ${Math.round(miles)} ${Math.round(miles) === 1 ? "mile" : "miles"} away${town}`;
}

// "closest" measures from the place on the map (catalogue.locate); until it is found (or if it can't be), the courses with a
// venue matching the typed words come first.
export function sortCourses(courses, sort, location = "", point = null) {
  if (sort === "closest") {
    const dist = (c) =>
      point ? Math.min(Infinity, ...c.venues.filter((v) => v.lat != null).map((v) => distanceKm(point, v))) : venueIn(c, location) ? 0 : Infinity;
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
// `base.fixed` lists the filters the page sets itself or doesn't offer ("subject", "sub", "method", "level", "price"): the
// address can't set them (/courses/first-aid?subject=security would otherwise list nothing under a filter nobody can see).
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
  const fixed = new Set(base.fixed || []);
  let min = fixed.has("price") ? PRICE_BOUNDS.min : num("min", PRICE_BOUNDS.min);
  let max = fixed.has("price") ? PRICE_BOUNDS.max : num("max", PRICE_BOUNDS.max);
  if (min > max) [min, max] = [max, min];

  // Checkbox groups hold several values: ?subject=first-aid,security. Unknown values are dropped, duplicates removed
  // and the rest sorted, so the same selection always makes the same URL.
  const many = (key, allowed, map = (v) => v) =>
    fixed.has(key) ? [] : [...new Set((params.get(key) || "").split(",").map((v) => map(v.trim().toLowerCase())).filter((v) => allowed.has(v)))].sort();
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
