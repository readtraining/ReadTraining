import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import FaqSection from "@/components/marketing/FaqSection";
import CtaBand from "@/components/marketing/CtaBand";
import StepsSection from "@/components/marketing/StepsSection";
import SubjectFacts from "@/components/testPrep/subject/SubjectFacts";
import JobsHero from "@/components/securityJobs/JobsHero";
import JobsRoles from "@/components/securityJobs/JobsRoles";
import JobsChecks from "@/components/securityJobs/JobsChecks";
import JobsConsent from "@/components/securityJobs/JobsConsent";
import JobsGrow from "@/components/securityJobs/JobsGrow";
import JobsApplication from "@/components/securityJobs/JobsApplication";
import JobsTraining from "@/components/securityJobs/JobsTraining";
import { securityJobs as s } from "@/data/securityJobs";
import { breadcrumbLd, faqPageLd, jsonLd, pageMetadata } from "@/lib/seo";
import { loadTaxonomy } from "@/lib/taxonomyServer";
import { courseCards } from "@/lib/catalogueServer";
import { faqItems } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";

// Security jobs (/security-jobs, the footer's For providers > Security Jobs), in the For Providers / Skill Saver page language.
// The opportunity first: hero with example matches > key facts strip > the five roles (#roles) > who can apply, as what employers
// check > how it works (the shared four-step row) > the consent promise (dark band) > where the work can lead > the application
// (#application), which opens with the eligibility questions > training for people not licensed yet (#training) > FAQs (#faqs) >
// closing call to action > help. Copy: data/securityJobs.js; the application is simulated (lib/securityJobs.js).

const PATH = "/security-jobs";
const crumbs = [{ label: "Home", href: "/" }, { label: s.hero.eyebrow }];

export const metadata = pageMetadata({ title: s.title, description: s.description, path: PATH });

export default async function SecurityJobsPage() {
  await loadSiteContent();
  const faq = faqItems("security-jobs", s.faq.items);
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const courses = await courseCards(s.training.picks);
  return (
    <div className="main-content rt-home fb-page rt-jobs-page">
      <a href="#rt-jobs-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-jobs-main" tabIndex={-1}>
          <JobsHero hero={s.hero} />
          <div className="container">
            <SubjectFacts facts={s.facts} />
          </div>
          <JobsRoles roles={s.roles} />
          <JobsChecks checks={s.checks} />
          <StepsSection workflow={s.how} />
          <JobsConsent consent={s.consent} />
          <JobsGrow grow={s.grow} />
          <JobsApplication />
          <JobsTraining training={s.training} courses={courses} />
          <FaqSection eyebrow={s.faq.eyebrow} title={s.faq.title} items={faq} idPrefix="jobs-faq" className="layout-pt-lg layout-pb-lg bg-light-4 rt-jobs__anchor" id="faqs" />
          <CtaBand cta={s.cta} id="rt-jobs-cta-h" />
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, PATH)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageLd(faq)) }} />
    </div>
  );
}
