import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import StepsSection from "@/components/marketing/StepsSection";
import FaqSection from "@/components/marketing/FaqSection";
import CtaBand from "@/components/marketing/CtaBand";
import SkillSaverHero from "@/components/skillSaver/SkillSaverHero";
import SkillSaverLevels from "@/components/skillSaver/SkillSaverLevels";
import SkillSaverFunding from "@/components/skillSaver/SkillSaverFunding";
import SkillSaverResults from "@/components/skillSaver/SkillSaverResults";
import { skillSaver } from "@/data/skillSaver";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";

// Provider Skill Saver (/provider-skill-saver), the footer's "Provider Skill Saver" link, in the /for-providers page language:
// masthead with the learner's view of a Skill Saver listing > how it works > the learner levels (lavender, switchable frame) >
// who pays the discount (the dark band) > expected results > FAQs > call to action > need help > footer. Copy: data/skillSaver.js.

const PATH = "/provider-skill-saver";
const crumbs = [{ label: "Home", href: "/" }, { label: "For providers", href: "/for-providers" }, { label: "Skill Saver" }];

export const metadata = pageMetadata({ title: skillSaver.title, description: skillSaver.description, path: PATH });

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: skillSaver.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function ProviderSkillSaverPage() {
  return (
    <div className="main-content rt-home fb-page rt-ss-page">
      <a href="#rt-ss-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper overflow-hidden">
        <main id="rt-ss-main" tabIndex={-1}>
          <SkillSaverHero hero={skillSaver.hero} discounts={skillSaver.funding.example.discounts} />
          <StepsSection workflow={skillSaver.steps} />
          <SkillSaverLevels levels={skillSaver.levels} />
          <SkillSaverFunding funding={skillSaver.funding} />
          <SkillSaverResults results={skillSaver.results} />
          <FaqSection eyebrow={skillSaver.faq.eyebrow} title={skillSaver.faq.title} items={skillSaver.faq.items} idPrefix="ss-faq" className="layout-pt-lg layout-pb-lg bg-light-4" />
          <div className="layout-pt-lg">
            <CtaBand cta={skillSaver.cta} id="rt-ss-cta-h" />
          </div>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, PATH)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
    </div>
  );
}
