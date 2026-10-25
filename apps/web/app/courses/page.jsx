import { Suspense } from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import HomeHelp from "@/components/home/HomeHelp";
import FaqSection from "@/components/marketing/FaqSection";
import { courseFaq, courseFaqEyebrow, courseFaqTitle } from "@/data/courseFaq";
import CourseCatalogue from "@/components/courses/CourseCatalogue";
import CourseListSkeleton from "@/components/courses/CourseListSkeleton";
import { CATALOGUE_HREF } from "@/lib/routes";
import { faqItems } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";
import { loadCatalogue } from "@/lib/catalogueServer";

// Static metadata on purpose: reading searchParams here would make the server re-render the page (and show any
// loading UI) on every filter change. Filtering is handled entirely in the browser, on every live course (API
// catalogue.listings, refreshed every minute: lib/catalogueServer.js).
export const metadata = {
  title: "All courses | ReadTraining",
  description: "Compare accredited training from UK providers. Classroom, live online and on demand.",
  alternates: { canonical: CATALOGUE_HREF },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "/" },
    { "@type": "ListItem", position: 2, name: "All courses", item: CATALOGUE_HREF },
  ],
};

export default async function page() {
  const [, courses] = await Promise.all([loadSiteContent(), loadCatalogue()]);
  return (
    <div className="main-content rt-home rt-cat-page">
      <a className="rt-skip" href="#rt-res-list">Skip to courses</a>
      <Preloader />
      <HomeHeader />
      {/* No overflow-hidden here: it would stop the filter panel from sticking. */}
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cat-main">
          <Suspense fallback={<CourseListSkeleton />}>
            <CourseCatalogue courses={courses} />
          </Suspense>
        </main>
        <FaqSection eyebrow={courseFaqEyebrow} title={courseFaqTitle} items={faqItems("courses", courseFaq)} idPrefix="cfaq" />
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    </div>
  );
}
