import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import SubjectHero from "@/components/testPrep/subject/SubjectHero";
import TestBooking, { BookTestButton } from "@/components/hseTest/TestBooking";
import BookingBand from "@/components/hseTest/BookingBand";
import CentreFinder from "@/components/hseTest/CentreFinder";
import { hseTest } from "@/data/hseTest";
import { HSE_TEST_HREF, TEST_CENTRES_HREF } from "@/lib/routes";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";

// The CSCS test centre directory (/cscs-test-centres): dark hero (book, about the test) > the postcode / town finder with every
// centre (nearest first once searched) > book with us (dark band) > need help. Each centre links to its page. Copy: data/hseTest.js.

const d = hseTest.directory;
const crumbs = [{ label: "Home", href: "/" }, { label: "CITB HS&E test", href: HSE_TEST_HREF }, { label: "Test centres" }];

export const metadata = pageMetadata({ title: d.title, description: d.description, path: TEST_CENTRES_HREF });

export default function TestCentresPage() {
  return (
    <div className="main-content rt-home fb-page rt-lic-page">
      <a href="#rt-tc-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-tc-main" tabIndex={-1}>
          <TestBooking>
            <SubjectHero crumbs={crumbs} title={d.heroTitle} lead={d.lead} label="Construction" top>
              <div className="rt-tps__actions">
                <BookTestButton>{hseTest.hero.book}</BookTestButton>
                <a href={HSE_TEST_HREF} className="button -md -outline-white text-white">About the test</a>
              </div>
            </SubjectHero>
            <section className="fb-section -white" aria-label="Find a test centre">
              <div className="container">
                <CentreFinder headingLevel="h2" />
              </div>
            </section>
            <BookingBand />
          </TestBooking>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, TEST_CENTRES_HREF)) }} />
    </div>
  );
}
