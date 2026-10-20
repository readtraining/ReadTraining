import { company } from "@/data/legal/company";
import { terms } from "@/data/legal/terms";
import { privacy } from "@/data/legal/privacy";
import { cookies } from "@/data/legal/cookies";
import { accessibility } from "@/data/legal/accessibility";
import { providerTerms } from "@/data/legal/providerTerms";
import { siteContent } from "@/lib/siteContent";

// Legal documents (terms, privacy, cookies, accessibility, provider terms). Pages read through here, not from data/ directly.
// The text, the dates and the draft marker are the site's editable content (admin > Site content > Legal pages; saved as
// "page:<slug>"): a saved version replaces the built-in one, whose title, description and address always stay. Call after
// loadSiteContent() on the server. A new document: add its data file here and a page that renders <LegalDocPage slug="..." />;
// it then appears in every legal page's tab bar too (and its slug must be added to the API's content keys).

const documents = { terms, privacy, cookies, accessibility, providerTerms };

// "8 October 2026" from "2026-10-08" (UTC, so the server and the browser agree)
export const formatLongDate = (iso) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

// The content key a document is saved under: "page:" and its slug in hyphens (providerTerms is "provider-terms").
export const legalContentKey = (slug) => `page:${slug.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

// The parts of a document an admin can change.
const editable = (d) => ({ lead: d.lead, updated: d.updated, effective: d.effective, draft: Boolean(d.draft), sections: d.sections.map(({ id, title, blocks }) => ({ id, title, blocks })) });

// A document as it was built (what "Use the built-in wording" goes back to), for the admin.
export const builtInLegal = (slug) => (documents[slug] ? editable(documents[slug]) : null);

// One document with its sections numbered (1, 2, ...) from their order: the saved version if there is one.
export function getLegalDocument(slug) {
  const doc = documents[slug];
  if (!doc) return null;
  const merged = { ...doc, ...(siteContent()[legalContentKey(slug)] ?? {}) };
  return { ...merged, sections: merged.sections.map((s, i) => ({ ...s, num: String(i + 1) })) };
}

// The legal documents that exist, in tab order, for the tab bar (and the admin's Legal pages list).
export const getLegalList = () => Object.values(documents).map((d) => ({ slug: d.slug, key: legalContentKey(d.slug), title: d.title, href: d.href }));

export const getLegalNav = () => Object.values(documents).map((d) => ({ slug: d.slug, title: d.title, href: d.href }));

export const getCompany = () => company;
