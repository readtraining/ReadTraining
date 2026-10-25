import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import FaqSection from "@/components/marketing/FaqSection";
import CourseCatalogue from "@/components/courses/CourseCatalogue";
import CourseListSkeleton from "@/components/courses/CourseListSkeleton";
import CourseTowns from "@/components/courses/CourseTowns";
import { getCourseTownPage, getCourseTownParams, getCourseTowns } from "@/lib/coursePages";
import { faqItems } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";
import { CATALOGUE_HREF } from "@/lib/routes";
import { loadTaxonomy } from "@/lib/taxonomyServer";
import { loadCatalogue } from "@/lib/catalogueServer";

// the real catalogue (every live listing), as the pages read it
const realCourses = loadCatalogue;

// A course page in one town (/courses/<page>/<town>, e.g. /courses/first-aid/leeds), as Hurak's course finder pages: the same
// catalogue with the town as its location (courses with a venue there, closest first; the visitor can change the town), the
// other towns, the page's FAQs. Reads: lib/coursePages.js (getCourseTownPage).

export async function generateStaticParams() {
  await loadTaxonomy();
  return getCourseTownParams(await realCourses());
}

export async function generateMetadata(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug, town } = await props.params;
  const page = getCourseTownPage(slug, town, await realCourses());
  if (!page) return { title: "Courses not found | ReadTraining" };
  return pageMetadata({ title: `${page.title} | ReadTraining`, description: page.description, path: page.href });
}

export default async function CourseTownPage(props) {
  await Promise.all([loadTaxonomy(), loadSiteContent()]); // catalogue names (categories, methods) and the site's content, on the server
  const { slug, town } = await props.params;
  const courses = await realCourses();
  const page = getCourseTownPage(slug, town, courses);
  if (!page) notFound();
  const faq = faqItems(`course-page-${slug}`, page.faq); // the same list as the page this town belongs to
  const crumbs = [{ label: "Home", href: "/" }, { label: "All courses", href: CATALOGUE_HREF }, { label: page.label, href: page.scope.parent.href }, { label: page.city }];

  return (
    <div className="main-content rt-home rt-cat-page">
      <a className="rt-skip" href="#rt-res-list">Skip to courses</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cat-main">
          <Suspense fallback={<CourseListSkeleton />}>
            <CourseCatalogue courses={page.courses} scope={page.scope} />
          </Suspense>
          <CourseTowns title={`${page.label.replace(/ courses$/i, "")} courses in other towns`} towns={getCourseTowns(slug, courses)} current={town} />
          <FaqSection eyebrow={page.label} title="Frequently asked questions" items={faq} idPrefix={`ctown-faq-${slug}`} />
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, page.href)) }} />
    </div>
  );
}
