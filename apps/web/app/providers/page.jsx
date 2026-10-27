import React, { Suspense } from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import MarketingHero from "@/components/marketing/MarketingHero";
import ProviderDirectory from "@/components/providers/ProviderDirectory";
import { providerPages } from "@/data/providers";
import { PROVIDERS_HREF, toProviderCard } from "@/lib/providers";
import { getProviderDirectory } from "@/lib/publicProvider";
import { abs, breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// Listed training providers (/providers), the footer's "Listed Training Providers" link, in the marketing-page language of
// /about-us and /blog: centred dark hero (Get started goes to /for-providers) > a search, the providers as cards with the count,
// Show all and page links (white band) > need help > footer. Every approved provider (API organisations.providerDirectory).
// Copy: data/providers.js; reads: lib/publicProvider.js, shaped by lib/providers.js.

const p = providerPages.directory;
const crumbs = [{ label: "Home", href: "/" }, { label: "Listed training providers" }];

export const metadata = pageMetadata({ title: p.title, description: p.description, path: PROVIDERS_HREF });

export default async function ProvidersPage() {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const providers = (await getProviderDirectory()).map(toProviderCard);
  const listLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Listed training providers",
    itemListElement: providers.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, url: abs(x.href) })),
  };
  return (
    <div className="main-content rt-home fb-page rt-tpage rt-prov-page">
      <a href="#rt-prov-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-prov-main" tabIndex={-1}>
          <MarketingHero hero={p.hero} />
          <section className="fb-section -white" aria-label="Providers">
            <div className="container">
              <Suspense fallback={null}>
                <ProviderDirectory providers={providers} />
              </Suspense>
            </div>
          </section>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, PROVIDERS_HREF)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(listLd) }} />
    </div>
  );
}
