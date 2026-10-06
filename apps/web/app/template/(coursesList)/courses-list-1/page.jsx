import { Suspense } from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import HomeHelp from "@/components/home/HomeHelp";
import CourseFaq from "@/components/courses/CourseFaq";
import CourseCatalogue from "@/components/courses/CourseCatalogue";
import CourseListSkeleton from "@/components/courses/CourseListSkeleton";

// Static metadata on purpose: reading searchParams here would make the server re-render the page (and show any
// loading UI) on every filter change. Filtering is handled entirely in the browser.
export const metadata = {
  title: "All courses | ReadTraining",
  description: "Compare accredited training from UK providers. Classroom, live online and on demand.",
  alternates: { canonical: "/template/courses-list-1" },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "/" },
    { "@type": "ListItem", position: 2, name: "All courses", item: "/template/courses-list-1" },
  ],
};

export default function page() {
  return (
    <div className="main-content rt-home">
      <a className="rt-skip" href="#rt-res-list">Skip to courses</a>
      <Preloader />
      <HomeHeader />
      {/* No overflow-hidden here: it would stop the filter panel from sticking. */}
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cat-main">
          <Suspense fallback={<CourseListSkeleton />}>
            <CourseCatalogue />
          </Suspense>
        </main>
        <CourseFaq />
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    </div>
  );
}
