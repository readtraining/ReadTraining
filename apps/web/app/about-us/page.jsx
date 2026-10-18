import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import StepsSection from "@/components/marketing/StepsSection";
import FaqSection from "@/components/marketing/FaqSection";
import MarketingHero from "@/components/marketing/MarketingHero";
import CtaBand from "@/components/marketing/CtaBand";
import SubjectFacts from "@/components/testPrep/subject/SubjectFacts";
import AboutStory from "@/components/aboutUs/AboutStory";
import AboutAudiences from "@/components/aboutUs/AboutAudiences";
import AboutMission from "@/components/aboutUs/AboutMission";
import { about, aboutFacts } from "@/data/about";
import { loadSiteContent } from "@/lib/siteContentServer";
import { founded, topBar } from "@/data/home";
import { abs, breadcrumbLd, jsonLd, pageMetadata, SITE_URL } from "@/lib/seo";

// About ReadTraining (/about-us), in the site's marketing-page language (/for-business, the Test Prep hub; `fb-page rt-tpage`
// turns on their section styles and the home heading scale): centred dark hero with the key facts on its edge > our story with
// what you can count on > how it works (lavender) > who we help > our mission (the dark band) > FAQs > call to action > need
// help > footer. "Contact us" goes to /contact-us. Copy: data/about.js.

const PATH = "/about-us";
const crumbs = [{ label: "Home", href: "/" }, { label: about.hero.eyebrow }];

export const metadata = pageMetadata({ title: about.title, description: about.description, path: PATH });

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ReadTraining",
  url: SITE_URL,
  logo: abs("/assets/img/general/readtraining-logo.svg"),
  foundingDate: String(founded),
  email: topBar.email,
  telephone: topBar.phone,
  areaServed: "GB",
};
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: about.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default async function AboutPage() {
  await loadSiteContent();
  return (
    <div className="main-content rt-home fb-page rt-tpage rt-about-page">
      <a href="#rt-about-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-about-main" tabIndex={-1}>
          <MarketingHero hero={about.hero} />
          <div className="container">
            <SubjectFacts facts={aboutFacts()} />
          </div>
          <AboutStory story={about.story} />
          <StepsSection workflow={about.steps} tone="lavender" />
          <AboutAudiences audiences={about.audiences} />
          <AboutMission mission={about.mission} />
          <FaqSection eyebrow={about.faq.eyebrow} title={about.faq.title} items={about.faq.items} idPrefix="about-faq" />
          <CtaBand cta={about.cta} id="rt-about-cta-h" />
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, PATH)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
    </div>
  );
}
