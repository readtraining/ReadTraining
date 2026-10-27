// The catalogue's one list (categories > sub-categories > topics, delivery methods, levels), as stored in the database and
// served by the API's catalogue.taxonomy (brief §4: the public filters, the provider's course form and the admin read the same
// list, so they can never drift apart). It is held here once loaded, so lookups such as methodName("live-online") work
// anywhere without passing the list around:
// - server code: `await loadTaxonomy()` (lib/taxonomyServer.js) before reading names;
// - in the browser: TaxonomyProvider (from the root layout's copy) sets it before any page renders; useTaxonomy() reads it.
// The demo course data stores only slugs; every name a person sees comes from here.

const EMPTY = { categories: [], methods: [], levels: [] };
let current = EMPTY;
let byCategory = new Map();
let byMethod = new Map();
let byLevel = new Map();

export function setTaxonomy(t) {
  if (!t || t === current) return;
  current = t;
  byCategory = new Map(t.categories.map((c) => [c.slug, c]));
  byMethod = new Map(t.methods.map((m) => [m.slug, m]));
  byLevel = new Map(t.levels.map((l) => [l.slug, l]));
}

// On the server a page renders alongside the root layout, not after it, so a server page that shows names must
// `await loadTaxonomy()` itself; reading a name before that is reported once in the server log instead of printing blanks.
let warned = false;
const ready = () => {
  if (current === EMPTY && typeof window === "undefined" && !warned) {
    warned = true;
    console.warn("[taxonomy] a catalogue name was read on the server before loadTaxonomy(); await it in that page");
  }
};
export const getTaxonomy = () => (ready(), current);
export const categoryName = (slug) => (ready(), byCategory.get(slug)?.name ?? "");
export const subcategoriesOf = (category) => (ready(), byCategory.get(category)?.subcategories ?? []);
export const subcategoryName = (category, sub) => subcategoriesOf(category).find((s) => s.slug === sub)?.name ?? "";
export const topicsOf = (category, sub) => subcategoriesOf(category).find((s) => s.slug === sub)?.topics ?? [];
export const topicName = (category, sub, topic) => topicsOf(category, sub).find((x) => x.slug === topic)?.name ?? "";
export const methodName = (slug) => (ready(), byMethod.get(slug)?.name ?? "");
export const levelName = (slug) => (ready(), byLevel.get(slug)?.name ?? "");

// Older addresses and links that used other words for the same method or level (the public pages redirect them too).
export const METHOD_ALIASES = { "on-demand": "self-paced", online: "self-paced", "online-self-paced": "self-paced", virtual: "live-online", "live online": "live-online", "online self-paced": "self-paced" };
export const LEVEL_ALIASES = { advance: "advanced" };

// The same list as dropdown and checkbox options ({ value, label }), for every form and filter.
const asOptions = (list) => (ready(), list.map((x) => ({ value: x.slug, label: x.name })));
export const categoryOptions = () => asOptions(current.categories);
export const subcategoryOptions = (category) => asOptions(subcategoriesOf(category));
export const topicOptions = (category, sub) => asOptions(topicsOf(category, sub));
export const methodOptions = () => asOptions(current.methods);
export const levelOptions = () => asOptions(current.levels);

// The shared course pages (API provider.courses.sharedPages) a course can go on: only a page for the same course, so the same
// sub-category, and the same topic when both have one (the API checks the same rule, sameSubject).
export const pagesForSubject = (pages, { subcategory, topic }) => pages.filter((p) => p.subcategory === subcategory && (!p.topic || !topic || p.topic === topic));
