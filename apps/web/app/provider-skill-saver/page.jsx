import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import StepsSection from "@/components/marketing/StepsSection";
import FaqSection from "@/components/marketing/FaqSection";
import CtaBand from "@/components/marketing/CtaBand";
import SkillSaverHero from "@/components/skillSaver/SkillSaverHero";
import SkillSaverListing from "@/components/skillSaver/SkillSaverListing";
import SkillSaverLevels from "@/components/skillSaver/SkillSaverLevels";
import SkillSaverFunding from "@/components/skillSaver/SkillSaverFunding";
import SkillSaverResults from "@/components/skillSaver/SkillSaverResults";
import { skillSaver } from "@/data/skillSaver";
import { breadcrumbLd, faqPageLd, jsonLd, pageMetadata } from "@/lib/seo";
import { faqItems } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";

// Provider Skill Saver (/provider-skill-saver), the footer's "Provider Skill Saver" link, in the /for-providers page language:
// masthead with the learner's view of a Skill Saver listing > how it works > the learner levels (lavender, switchable frame) >
// who pays the discount (the dark band) > expected results > FAQs > call to action > need help > footer. Copy: data/skillSaver.js.

const PATH = "/provider-skill-saver";
const crumbs = [{ label: "Home", href: "/" }, { label: "For providers", href: "/for-providers" }, { label: "Skill Saver" }];

export const metadata = pageMetadata({ title: skillSaver.title, description: skillSaver.description, path: PATH });

export default async function ProviderSkillSaverPage() {
  await loadSiteContent();
  const faq = faqItems("provider-skill-saver", skillSaver.faq.items);
  return (
    <div className="main-content rt-home fb-page rt-ss-page">
      <a href="#rt-ss-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper overflow-hidden">
        <main id="rt-ss-main" tabIndex={-1}>
          <SkillSaverHero
            hero={skillSaver.hero}
            id="rt-ss-hero"
            visual={<SkillSaverListing listing={skillSaver.hero.listing} discounts={skillSaver.funding.example.discounts} />}
            float={{ title: "Discount applied", text: "Funded by ReadTraining" }}
          />
          <StepsSection workflow={skillSaver.steps} />
          <SkillSaverLevels levels={skillSaver.levels} />
          <SkillSaverFunding funding={skillSaver.funding} />
          <SkillSaverResults results={skillSaver.results} />
          <FaqSection eyebrow={skillSaver.faq.eyebrow} title={skillSaver.faq.title} items={faq} idPrefix="ss-faq" className="layout-pt-lg layout-pb-lg bg-light-4" />
          <div className="layout-pt-lg">
            <CtaBand cta={skillSaver.cta} id="rt-ss-cta-h" />
          </div>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, PATH)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageLd(faq)) }} />
    </div>
  );
}
