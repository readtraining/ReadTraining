import { contentDefaults } from "@/data/home";

// The site's editable content (Part B, B2): the trust numbers and the homepage's featured courses (the customer reviews are
// their own table: lib/siteReviews.js). An admin saves them in the admin (API content.save); the site reads them through content.site. A key
// that was never saved uses its built-in value (data/home contentDefaults), so the site reads the same until someone changes
// it. Held here once loaded, like the catalogue list (lib/taxonomy.js):
// - server code: `await loadSiteContent()` (lib/siteContentServer.js) before reading;
// - in the browser: Providers (from the root layout's copy, see browserContent) sets it before any page renders.
// Every page that quotes a number reads it from here, so they always agree.

let current = contentDefaults;

export function setSiteContent(stored) {
  if (!stored) return;
  current = { ...contentDefaults, ...Object.fromEntries(Object.entries(stored).filter(([, v]) => v !== undefined)) };
}

// What the root layout hands to the browser. Only the trust numbers are read by browser components (the hero's rating line);
// everything else (the featured courses) is read on the server, so it isn't sent to every page. A browser
// component that needs another key must have it added here. `hasReviews` (from the root layout's loadReviews) says whether any
// customer review is published, so the footer can leave out the Customer reviews link without them.
export const browserContent = (stored, hasReviews) => ({ ...(stored?.trust ? { trust: stored.trust } : {}), hasReviews: Boolean(hasReviews) });

export const siteContent = () => current;

const plus = (n) => `${n.toLocaleString("en-GB")}+`;

// The trust numbers as the site words them: "4.9 / 5", "4.9 out of 5", "1,160+", "1,000+". A number an admin hasn't
// entered is null, and the pages leave it out (a rating always comes with its number of reviews).
export function trustFigures() {
  const t = current.trust;
  const rating = t.rating == null ? null : t.rating.toFixed(1);
  const n = (x) => (x == null ? null : plus(x));
  // where the rating comes from ("Google") and its link, shown beside the rating when set and only with the rating
  const source = rating && t.source ? t.source : null;
  return { rating, ratingSlash: rating && `${rating} / 5`, ratingOutOf: rating && `${rating} out of 5`, reviews: n(t.reviews), customers: n(t.customers), courses: n(t.courses), source, sourceUrl: source && t.sourceUrl ? t.sourceUrl : null };
}

// Text with trust placeholders filled in: "{rating}" 4.9, "{ratingSlash}" 4.9 / 5, "{ratingOutOf}" 4.9 out of 5, "{reviews}",
// "{customers}", "{courses}". Lets an FAQ answer quote a number without it going out of date. Null when the text quotes a
// number that isn't entered (the FAQ then leaves that question out).
const PLACEHOLDER = /\{(rating|ratingSlash|ratingOutOf|reviews|customers|courses)\}/g;
export const withTrust = (text) => {
  const f = trustFigures();
  if ([...text.matchAll(PLACEHOLDER)].some((m) => f[m[1]] == null)) return null;
  return text.replace(PLACEHOLDER, (_, k) => f[k]);
};

// One page's FAQ list: the one an admin saved for it, else the page's own built-in list (`defaults`). `key` is the page's set
// (data/faqSets.js lists them). Call after loadSiteContent() on the server. A question quoting a trust number that isn't
// entered is left out.
export const faqItems = (key, defaults) =>
  (current[`faq:${key}`]?.items ?? defaults).map(({ q, a }) => ({ q: withTrust(q), a: withTrust(a) })).filter((x) => x.q !== null && x.a !== null);

export const featuredGroups = () => current.featured.groups;
// Whether any customer review is published (browser components: the footer). Server code reads the reviews themselves.
export const hasReviews = () => current.hasReviews === true;
export const seoSettings = () => current.seo;
