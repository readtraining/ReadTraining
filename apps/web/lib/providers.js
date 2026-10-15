import { providers } from "@/data/providers";
import { getCourseBySlug, getSubjectLabel } from "@/lib/courses";
import { catalogueCourses } from "@/data/courseCatalogue";

// All reads for the listed providers go through here. Swap the bodies for API calls later.
// A provider's courses are the catalogue courses that have at least one session with that provider (the names on the course
// pages' dates), so a provider page and the course pages always agree. Each course shows the provider's lowest session price.

export const PROVIDERS_HREF = "/providers";
export const PROVIDERS_PAGE_SIZE = 6;
export const providerHref = (slug) => `${PROVIDERS_HREF}/${slug}`;

const MODE_LABEL = { classroom: "Classroom", online: "Live online", ondemand: "On demand" };
const MODE_ORDER = Object.keys(MODE_LABEL);
const unique = (list) => [...new Set(list)];

// "BrightPath Academy" -> "BA", the stand-in for a logo until providers upload one
const providerInitials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

let index;
function buildIndex() {
  const byName = new Map(providers.map((p) => [p.name, []]));
  for (const base of catalogueCourses) {
    const detail = getCourseBySlug(base.id);
    const byProvider = new Map();
    for (const s of detail.sessions) {
      if (!byName.has(s.provider)) continue;
      if (!byProvider.has(s.provider)) byProvider.set(s.provider, []);
      byProvider.get(s.provider).push(s);
    }
    for (const [name, sessions] of byProvider) {
      const lowest = sessions.reduce((a, b) => (b.price < a.price ? b : a));
      byName.get(name).push({
        id: base.id,
        title: base.title,
        imageSrc: base.imageSrc,
        href: base.detailsHref,
        duration: base.duration,
        subject: getSubjectLabel(base),
        modes: MODE_ORDER.filter((m) => sessions.some((s) => s.mode === m)).map((m) => MODE_LABEL[m]),
        cities: unique(sessions.map((s) => s.city).filter(Boolean)),
        price: lowest.price,
        wasPrice: lowest.wasPrice,
      });
    }
  }
  return providers.map((p, i) => {
    const courses = byName.get(p.name).sort((a, b) => a.title.localeCompare(b.title));
    return {
      ...p,
      href: providerHref(p.slug),
      initials: providerInitials(p.name),
      imageSrc: `/assets/img/coursesCards/${(i % 12) + 1}.png`, // stand-in photo until providers upload one
      courses,
      subjects: unique(courses.map((c) => c.subject)),
      modes: MODE_ORDER.map((m) => MODE_LABEL[m]).filter((l) => courses.some((c) => c.modes.includes(l))),
      cities: unique(courses.flatMap((c) => c.cities)).sort(),
    };
  });
}

export function getProviders() {
  return (index ||= buildIndex());
}

export const getProvider = (slug) => getProviders().find((p) => p.slug === slug) || null;
// What the directory's card needs (not the whole course list, which would be sent to the browser with the page)
export const toProviderCard = (p) => ({ slug: p.slug, name: p.name, href: p.href, initials: p.initials, imageSrc: p.imageSrc, city: p.city, courseCount: p.courses.length, subjects: p.subjects });

export const getProviderSlugs = () => providers.map((p) => p.slug);

// "Security, First Aid and Health & Safety"
export const joinList = (items) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items[0] || "");

export const fillName = (text, name) => text.replace("{name}", name);
