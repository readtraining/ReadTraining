import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import StepsSection from "@/components/marketing/StepsSection";
import FaqSection from "@/components/marketing/FaqSection";
import CtaBand from "@/components/marketing/CtaBand";
import SkillSaverHero from "@/components/skillSaver/SkillSaverHero";
import SaverStatus from "@/components/skillSaver/SaverStatus";
import SaverLevels from "@/components/skillSaver/SaverLevels";
import SaverProgress from "@/components/skillSaver/SaverProgress";
import { SKILL_SAVER_PATH, skillSaverLearner as s } from "@/data/skillSaverLearner";
import { SKILL_SAVER_LEVELS } from "@/lib/skillSaver";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";
import { getServerClaims } from "@/lib/supabase/server";

// Skill Saver Programme for learners (/skill-saver), the footer's "Skill Saver Programme", in the Provider Skill Saver page
// language: masthead with an example learner level > how it works > the three levels (lavender) > your own level beside the
// rules (signed in) or a sign-in prompt > FAQs > call to action > need help > footer. Copy: data/skillSaverLearner.js.
// Who is signed in is read on the server (proxy.js refreshes the session first), so the hero's buttons arrive right with no
// flash: signed out "Create a free account" and "See the levels", signed in "Find a course" and "See your level".

const crumbs = [{ label: "Home", href: "/" }, { label: "Skill Saver Programme" }];

export const metadata = pageMetadata({ title: s.title, description: s.description, path: SKILL_SAVER_PATH });

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: s.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

// the hero's example learner: Level 2, part way to Level 3
const ex = s.hero.example;
const exLevel = SKILL_SAVER_LEVELS[ex.level - 1];
const exNext = SKILL_SAVER_LEVELS[ex.level];
const exampleStatus = { ...exLevel, next: { ...exNext, have: ex.have } };

export default async function SkillSaverLearnerPage() {
  const claims = await getServerClaims();
  const person = claims ? { firstName: claims.user_metadata?.first_name || "" } : null;
  const [primary, secondary] = person ? s.hero.signedIn : [s.hero.primary, s.hero.secondary];

  return (
    <div className="main-content rt-home fb-page rt-ss-page">
      <a href="#rt-sv-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper overflow-hidden">
        <main id="rt-sv-main" tabIndex={-1}>
          <SkillSaverHero
            hero={{ ...s.hero, primary, secondary }}
            id="rt-sv-hero"
            visual={<SaverStatus title={ex.frame} greeting={`Hi ${ex.name}, here's your level`} status={exampleStatus} />}
            float={s.hero.float}
          />
          <StepsSection workflow={s.steps} />
          <SaverLevels levels={s.levels} />
          <SaverProgress progress={s.progress} initialPerson={person} />
          <FaqSection eyebrow={s.faq.eyebrow} title={s.faq.title} items={s.faq.items} idPrefix="sv-faq" className="layout-pt-lg layout-pb-lg bg-light-4" />
          <div className="layout-pt-lg">
            <CtaBand cta={s.cta} id="rt-sv-cta-h" />
          </div>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, SKILL_SAVER_PATH)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
    </div>
  );
}
