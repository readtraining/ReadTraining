import { contentDefaults } from "@/data/home";

// The site's editable content (Part B, B2): the trust numbers, the homepage's featured courses, the testimonials and the
// video story's words. An admin saves them in the admin (API content.save); the site reads them through content.site. A key
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
// everything else (the featured courses, the testimonials, the video words) is read on the server, so it isn't sent to every
// page: forty saved testimonials would otherwise travel with every page of the site. A browser component that needs another
// key must have it added here.
export const browserContent = (stored) => (stored?.trust ? { trust: stored.trust } : {});

export const siteContent = () => current;

const plus = (n) => `${n.toLocaleString("en-GB")}+`;

// The trust numbers as the site words them: "4.9 / 5", "4.9 out of 5", "12,450+", "250,000+", "1,000+".
export function trustFigures() {
  const t = current.trust;
  const rating = t.rating.toFixed(1);
  return { rating, ratingSlash: `${rating} / 5`, ratingOutOf: `${rating} out of 5`, reviews: plus(t.reviews), customers: plus(t.customers), courses: plus(t.courses) };
}

// Text with trust placeholders filled in: "{rating}" 4.9, "{ratingSlash}" 4.9 / 5, "{ratingOutOf}" 4.9 out of 5, "{reviews}",
// "{customers}", "{courses}". Lets an FAQ answer quote a number without it going out of date.
export const withTrust = (text) => {
  const f = trustFigures();
  return text.replace(/\{(rating|ratingSlash|ratingOutOf|reviews|customers|courses)\}/g, (_, k) => f[k]);
};

// One page's FAQ list: the one an admin saved for it, else the page's own built-in list (`defaults`). `key` is the page's set
// (data/faqSets.js lists them). Call after loadSiteContent() on the server.
export const faqItems = (key, defaults) => (current[`faq:${key}`]?.items ?? defaults).map(({ q, a }) => ({ q: withTrust(q), a: withTrust(a) }));

export const featuredGroups = () => current.featured.groups;
export const testimonials = () => current.testimonials;
export const homeTestimonials = () => current.testimonials.filter((t) => t.home).slice(0, 4);
export const videoStory = () => current.video;
