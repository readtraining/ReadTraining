import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import MarketingHero from "@/components/marketing/MarketingHero";
import CtaBand from "@/components/marketing/CtaBand";
import HelpSearch from "@/components/help/HelpSearch";
import HelpTopics from "@/components/help/HelpTopics";
import HelpLinks from "@/components/help/HelpLinks";
import { getHelpPage, getHelpSearchIndex, getHelpTopics, getPopularHelp, HELP_HREF } from "@/lib/help";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";

// The Help Centre hub (/help-centre), in the marketing-page language (as /about-us and /contact-us): dark hero with the search
// (suggestions as you type) > browse by topic > popular articles (lavender) > still need help > footer. Articles: data/help.js.

const page = getHelpPage();
const crumbs = [{ label: "Home", href: "/" }, { label: page.hero.eyebrow }];

export const metadata = pageMetadata({ title: page.title, description: page.description, path: HELP_HREF });

export default function HelpCentrePage() {
  return (
    <div className="main-content rt-home fb-page rt-tpage rt-help-page">
      <a href="#rt-help-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-help-main" tabIndex={-1}>
          <MarketingHero hero={page.hero}>
            <HelpSearch items={getHelpSearchIndex()} />
          </MarketingHero>
          <HelpTopics title={page.topicsTitle} topics={getHelpTopics()} />
          <section className="fb-section -lavender" aria-labelledby="rt-help-popular-h">
            <div className="container">
              <div className="fb-head -center">
                <h2 className="fb-title" id="rt-help-popular-h">{page.popularTitle}</h2>
              </div>
              <HelpLinks items={getPopularHelp()} columns={2} />
            </div>
          </section>
          <div className="rt-help__cta">
            <CtaBand cta={page.stillNeedHelp} id="rt-help-cta-h" />
          </div>
        </main>
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, HELP_HREF)) }} />
    </div>
  );
}
