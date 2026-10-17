import { company } from "@/data/legal/company";
import { terms } from "@/data/legal/terms";
import { privacy } from "@/data/legal/privacy";
import { cookies } from "@/data/legal/cookies";
import { accessibility } from "@/data/legal/accessibility";
import { providerTerms } from "@/data/legal/providerTerms";

// Legal documents (terms, privacy, cookies, accessibility, provider terms). Pages read through here, not from data/
// directly, so the bodies can move to the API or a CMS later with the same return shape. A new document: add its data file
// here and a page that renders <LegalDocPage slug="..." />; it then appears in every legal page's tab bar too.

const documents = { terms, privacy, cookies, accessibility, providerTerms };

// "8 October 2026" from "2026-10-08" (UTC, so the server and the browser agree)
export const formatLongDate = (iso) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

// One document with its sections numbered (1, 2, ...) from their order in the data.
export function getLegalDocument(slug) {
  const doc = documents[slug];
  if (!doc) return null;
  return { ...doc, sections: doc.sections.map((s, i) => ({ ...s, num: String(i + 1) })) };
}

// The legal documents that exist, in tab order, for the tab bar.
export const getLegalNav = () => Object.values(documents).map((d) => ({ slug: d.slug, title: d.title, href: d.href }));

export const getCompany = () => company;
