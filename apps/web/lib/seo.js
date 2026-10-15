// Shared page metadata and JSON-LD for server pages (app/layout.jsx sets the site-wide defaults; each page still sets its own
// metadataBase). Same shape as the test prep subject page builds by hand.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const abs = (path) => `${SITE_URL}${path}`;
// JSON for a <script type="application/ld+json">, with "<" escaped so the text can never close the script tag
export const jsonLd = (data) => JSON.stringify(data).replace(/</g, "\\u003c");

// Next.js metadata for one page: title, description, canonical, Open Graph and Twitter. `noindex` keeps a draft out of search.
export function pageMetadata({ title, description, path, noindex = false }) {
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "ReadTraining", locale: "en_GB", title, description, url: path },
    twitter: { card: "summary", title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

// `crumbs` is [{ label, href? }]; the last one (the current page) takes `path`.
export const breadcrumbLd = (crumbs, path) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: abs(c.href || path) })),
});

// A plain WebPage with its dates (ISO "YYYY-MM-DD"), e.g. a legal page whose "Last updated" line must match dateModified.
export const webPageLd = ({ name, description, path, datePublished, dateModified }) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name,
  description,
  url: abs(path),
  inLanguage: "en-GB",
  ...(datePublished ? { datePublished } : {}),
  ...(dateModified ? { dateModified } : {}),
  isPartOf: { "@type": "WebSite", name: "ReadTraining", url: SITE_URL },
});
