import { connection } from "next/server";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import HomeHelp from "@/components/home/HomeHelp";
import FaqSection from "@/components/marketing/FaqSection";
import { courseFaq, courseFaqEyebrow, courseFaqTitle } from "@/data/courseFaq";
import CourseCatalogue from "@/components/courses/CourseCatalogue";
import { CATALOGUE_HREF } from "@/lib/routes";
import { faqItems } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";
import { loadCatalogue } from "@/lib/catalogueServer";

// All courses (/courses). Rendered for each request (connection()), so the page arrives with the courses its address asks for
// (?q=, filters, ?page=) already in it: search engines and a slow connection get the heading, the cards and the page links, not a
// placeholder. The courses come from the fetch cache (API catalogue.listings, refreshed every minute: lib/catalogueServer.js),
// so this costs the API nothing per visit. After that the browser filters on its own: CourseCatalogue writes the address with the
// History API, which doesn't ask the server again. Static metadata on purpose: the canonical is /courses whatever the filters.
export const metadata = pageMetadata({
  title: "All courses | ReadTraining",
  description: "Compare accredited training from UK providers. Classroom, live online and on demand.",
  path: CATALOGUE_HREF,
});

const crumbs = [{ label: "Home", href: "/" }, { label: "All courses" }];

export default async function page() {
  await connection();
  const [, courses] = await Promise.all([loadSiteContent(), loadCatalogue()]);
  return (
    <div className="main-content rt-home rt-cat-page">
      <a className="rt-skip" href="#rt-res-list">Skip to courses</a>
      <Preloader />
      <HomeHeader />
      {/* No overflow-hidden here: it would stop the filter panel from sticking. */}
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cat-main">
          <CourseCatalogue courses={courses} />
        </main>
        <FaqSection eyebrow={courseFaqEyebrow} title={courseFaqTitle} items={faqItems("courses", courseFaq)} idPrefix="cfaq" />
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, CATALOGUE_HREF)) }} />
    </div>
  );
}
