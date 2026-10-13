import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import FaqSection from "@/components/marketing/FaqSection";
import { Eyebrow } from "@/components/marketing/parts";
import SubjectHero from "@/components/testPrep/subject/SubjectHero";
import SubjectFacts from "@/components/testPrep/subject/SubjectFacts";
import SubjectArticle from "@/components/testPrep/subject/SubjectArticle";
import LicenceCourses from "@/components/licences/LicenceCourses";
import TestBooking, { BookTestButton } from "@/components/hseTest/TestBooking";
import TestTypes from "@/components/hseTest/TestTypes";
import BookingBand from "@/components/hseTest/BookingBand";
import CentreFinder from "@/components/hseTest/CentreFinder";
import { HSE_PRICE, hseTest as t } from "@/data/hseTest";
import { licencesHub } from "@/data/licences";
import { testCourses } from "@/lib/hseTest";
import { HSE_TEST_HREF } from "@/lib/routes";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";

// The CITB HS&E test (/tests/citb-health-safety-and-environment-test, the Locations menu's "CITB HS&E Test"), in the licence
// guides' language: dark hero (book, find a centre) > key facts > which test do I need (lavender) > book with us (dark band,
// price) > the guide (contents column + article) > find a test centre (the finder, first 6) > training for your card > FAQs >
// need help. "Book your test" opens the page's one booking pop-up (TestBooking). Copy: data/hseTest.js.

const crumbs = [{ label: "Home", href: "/" }, { label: "Licences & Cards", href: "/licences" }, { label: "CITB HS&E test" }];

export const metadata = pageMetadata({ title: t.title, description: t.description, path: HSE_TEST_HREF });

const productLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "CITB Health, Safety and Environment test booking",
  description: t.description,
  offers: { "@type": "Offer", price: HSE_PRICE.toFixed(2), priceCurrency: "GBP", availability: "https://schema.org/InStock" },
};
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: t.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function HseTestPage() {
  return (
    <div className="main-content rt-home fb-page rt-lic-page">
      <a href="#rt-ht-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-ht-main" tabIndex={-1}>
          <TestBooking>
            <SubjectHero crumbs={crumbs} title={t.hero.title} lead={t.hero.lead} label={t.hero.label} top>
              <div className="rt-tps__actions">
                <BookTestButton>{t.hero.book}</BookTestButton>
                <a href="#centres" className="button -md -outline-white text-white">{t.hero.find}</a>
              </div>
            </SubjectHero>
            <div className="container">
              <SubjectFacts facts={t.facts} />
            </div>
            <TestTypes />
            <BookingBand />
            <section className="fb-section -white" aria-label="Guide to the HS&E test">
              <div className="container">
                <SubjectArticle sections={t.sections} />
              </div>
            </section>
            <section className="fb-section -lavender" id="centres" aria-labelledby="rt-ht-centres-h">
              <div className="container">
                <div className="fb-head -center">
                  <Eyebrow>{t.centres.eyebrow}</Eyebrow>
                  <h2 className="fb-title" id="rt-ht-centres-h">{t.centres.title}</h2>
                  <p className="fb-lede">{t.centres.text}</p>
                </div>
                <CentreFinder limit={6} />
              </div>
            </section>
            <LicenceCourses courses={testCourses()} training={t.courses} copy={licencesHub.page} />
            <FaqSection eyebrow="HS&E test" title="Frequently asked questions" items={t.faqs} idPrefix="ht-faq" className="layout-pt-lg layout-pb-lg bg-light-4" />
          </TestBooking>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, HSE_TEST_HREF)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
    </div>
  );
}
