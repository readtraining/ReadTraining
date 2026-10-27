import { categoryName, methodName } from "@/lib/taxonomy";
import { coursePath } from "@/lib/routes";

// The public provider pages (/providers and /providers/<slug>), from the real providers (API organisations.providerDirectory and
// .providerProfile, read by lib/publicProvider.js): plain helpers that put them in the shapes the pages' cards and sections read.
// Category and method names come from the catalogue list (await loadTaxonomy() first, on the server).

export const PROVIDERS_HREF = "/providers";
export const PROVIDERS_PAGE_SIZE = 6;
export const providerHref = (slug) => `${PROVIDERS_HREF}/${slug}`;

const unique = (list) => [...new Set(list)];
const pounds = (p) => (p == null ? null : p / 100);

// "BrightPath Academy" -> "BA", shown when a provider has no logo yet
export const providerInitials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

// A directory entry, as the directory's card reads it
export const toProviderCard = (d) => ({
  slug: d.slug,
  name: d.name,
  href: providerHref(d.slug),
  initials: providerInitials(d.name),
  logoUrl: d.logoUrl,
  city: d.city,
  headline: d.headline,
  courseCount: d.courseCount,
  subjects: d.categories.map(categoryName).filter(Boolean),
});

// A public profile with its courses, as the provider page reads it
export function toProviderPage(r) {
  const courses = r.courses.map((c) => ({
    id: c.slug,
    title: c.title,
    imageSrc: c.imageUrl || "",
    href: coursePath(c.slug),
    duration: c.duration,
    subject: categoryName(c.category),
    modes: c.methods.map(methodName),
    cities: c.cities,
    price: pounds(c.fromPence),
    wasPrice: pounds(c.wasPence),
  }));
  return {
    ...r,
    href: providerHref(r.slug),
    initials: providerInitials(r.name),
    about: r.bio || r.headline,
    courses,
    subjects: unique(courses.map((c) => c.subject).filter(Boolean)),
    modes: unique(courses.flatMap((c) => c.modes)),
    cities: unique(courses.flatMap((c) => c.cities)).sort(),
  };
}

// "Security, First Aid and Health & Safety"
export const joinList = (items) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items[0] || "");

export const fillName = (text, name) => text.replace("{name}", name);
