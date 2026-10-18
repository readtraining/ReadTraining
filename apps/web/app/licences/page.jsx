import React, { Suspense } from "react";
import Link from "next/link";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import MarketingHero from "@/components/marketing/MarketingHero";
import StepsSection from "@/components/marketing/StepsSection";
import FaqSection from "@/components/marketing/FaqSection";
import CtaBand from "@/components/marketing/CtaBand";
import { Eyebrow } from "@/components/marketing/parts";
import SubjectFacts from "@/components/testPrep/subject/SubjectFacts";
import LicenceHubGrid, { LicenceHubGridFromUrl } from "@/components/licences/LicenceHubGrid";
import { licencesHub as hub, licences } from "@/data/licences";
import { breadcrumbLd, faqPageLd, jsonLd, pageMetadata } from "@/lib/seo";
import { faqItems } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";

// Licences & cards hub (/licences, the menu's "Licences & Cards"), in the learner pages' language: the marketing hero (dark,
// centred) > key facts strip > every licence and card with industry filters (#all) > how it works (the shared four-step row) >
// helpful tools (home's team tiles: free mock tests, certificate checker, help) > FAQs > call to action. Copy: data/licences.js.

const PATH = "/licences";
const crumbs = [{ label: "Home", href: "/" }, { label: hub.hero.eyebrow }];

export const metadata = pageMetadata({ title: hub.title, description: hub.description, path: PATH });

export default async function LicencesPage() {
  await loadSiteContent();
  const faq = faqItems("licences", hub.faq.items);
  return (
    <div className="main-content rt-home fb-page rt-tpage rt-lic-page">
      <a href="#rt-lic-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-lic-main" tabIndex={-1}>
          <MarketingHero hero={hub.hero} />
          <div className="container">
            <SubjectFacts facts={hub.facts} />
          </div>
          {/* the industry comes from the address once the page is in the browser; until then, all licences */}
          <Suspense fallback={<LicenceHubGrid copy={hub.grid} groups={hub.groups} licences={licences} tileLabel={hub.page.tileLink} />}>
            <LicenceHubGridFromUrl copy={hub.grid} groups={hub.groups} licences={licences} tileLabel={hub.page.tileLink} />
          </Suspense>
          <StepsSection workflow={hub.steps} tone="lavender" />
          <section className="fb-section -white" aria-labelledby="rt-lic-tools-h">
            <div className="container">
              <div className="fb-head -center">
                <Eyebrow>{hub.tools.eyebrow}</Eyebrow>
                <h2 className="fb-title" id="rt-lic-tools-h">{hub.tools.title}</h2>
              </div>
              <ul className="rt-teamtiles rt-lic__tools">
                {hub.tools.items.map((x) => (
                  <li key={x.title} className="rt-teamtile">
                    <span className="rt-teamtile__icon" aria-hidden="true"><i className={`${x.icon} text-18`}></i></span>
                    <h3 className="rt-teamtile__title">{x.title}</h3>
                    <p className="rt-teamtile__text">{x.text}</p>
                    <Link href={x.link.href} className="fb-textlink">{x.link.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <FaqSection eyebrow={hub.faq.eyebrow} title={hub.faq.title} items={faq} idPrefix="lic-hub-faq" className="layout-pt-lg layout-pb-lg bg-light-4" />
          <CtaBand cta={hub.cta} id="rt-lic-hub-cta-h" />
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, PATH)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageLd(faq)) }} />
    </div>
  );
}
