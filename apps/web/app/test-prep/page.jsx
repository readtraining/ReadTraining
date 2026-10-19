import React from "react";
import Link from "next/link";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import StepsSection from "@/components/marketing/StepsSection";
import FaqSection from "@/components/marketing/FaqSection";
import TestPrepHub from "@/components/testPrep/TestPrepHub";
import TestPrepCourses from "@/components/testPrep/TestPrepCourses";
import { testPrepPage, tests } from "@/data/testPrep";
import { resolveTests, subjectExam, subjectLead } from "@/lib/testPrep";
import { faqItems } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";
import { loadTaxonomy } from "@/lib/taxonomyServer";

export const metadata = {
  title: testPrepPage.title,
  description: testPrepPage.description,
  alternates: { canonical: "/test-prep" },
};

// Test prep hub. Every section is one of the site's own: catalogue hero, the four-step "How it works"
// row (/for-business), the full test list, home's course cards, the FAQ accordion and the dark CTA band.
// `fb-page` turns on the business/provider section styles that StepsSection uses.
export default async function TestPrepPage(props) {
  await Promise.all([loadTaxonomy(), loadSiteContent()]); // catalogue names (categories, methods) and the site's content, on the server
  const query = (await props.searchParams) || {};
  const { resources, resourcesCta, steps, faq } = testPrepPage;
  // each card shows the subject page's own lead and exam numbers, so the hub and the subject page agree
  const cards = tests.map((t) => ({ ...t, lead: subjectLead(t.slug), exam: subjectExam(t.slug), testCount: resolveTests(t.slug).length }));
  return (
    <div className="main-content rt-home fb-page rt-tpage">
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="main">
          <TestPrepHub tests={cards} initialCategory={String(query.category || "")} initialQuery={String(query.q || "")} initialPage={Number(query.page) || 1}>
            <StepsSection workflow={steps} tone="lavender" />
          </TestPrepHub>

          <TestPrepCourses />

          <FaqSection eyebrow={faq.eyebrow} title={faq.title} items={faqItems("test-prep", faq.items)} idPrefix="tp-faq" className="layout-pt-lg layout-pb-lg rt-tp__faq" />

          <section className="rt-tp__resources layout-pb-lg">
            <div className="container">
              <div className="bz-cta3">
                <div className="bz-cta3__text">
                  <div className="rt-eyebrow rt-eyebrow--pill -onDark"><span className="rt-eyebrow__dot"></span>{resources.eyebrow}</div>
                  <h2 className="bz-cta3__title mt-15">{resources.title}</h2>
                  <p className="bz-cta3__lede">{resources.text}</p>
                </div>
                <div className="bz-cta3__actions">
                  <Link href={resourcesCta.href} className="button -md -purple-1 text-white">{resourcesCta.label} <i className="icon-arrow-right text-13 ml-10"></i></Link>
                </div>
              </div>
            </div>
          </section>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
    </div>
  );
}
