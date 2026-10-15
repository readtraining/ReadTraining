import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import HomeTextLink from "@/components/home/HomeTextLink";
import FaqSection from "@/components/marketing/FaqSection";
import CourseCatalogue from "@/components/courses/CourseCatalogue";
import CourseListSkeleton from "@/components/courses/CourseListSkeleton";
import PostCard from "@/components/blog/PostCard";
import CourseTowns from "@/components/courses/CourseTowns";
import { getCoursePage, getCoursePageSlugs, getCourseTowns } from "@/lib/coursePages";
import { BLOG_HREF } from "@/lib/blog";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";
import { CATALOGUE_HREF } from "@/lib/routes";

// A course page (/courses/<slug>: a study method, a subject or a set of courses, from the footer's "Find a course"): the course
// catalogue scoped to the page (its title and intro in the hero, links to the other course pages, the same search, filters,
// sorting and cards as All courses), then the towns with a venue (each with its own town page), the blog's guides on the topic, the page's FAQs, need help and the footer.
// Copy: data/coursePages.js; reads: lib/coursePages.js.

export function generateStaticParams() {
  return getCoursePageSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props) {
  const { slug } = await props.params;
  const page = getCoursePage(slug);
  if (!page) return { title: "Courses not found | ReadTraining" };
  return pageMetadata({ title: `${page.title} | ReadTraining`, description: page.description, path: page.href });
}

export default async function CoursePage(props) {
  const { slug } = await props.params;
  const page = getCoursePage(slug);
  if (!page) notFound();
  const crumbs = [{ label: "Home", href: "/" }, { label: "All courses", href: CATALOGUE_HREF }, { label: page.label }];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="main-content rt-home rt-cat-page">
      <a className="rt-skip" href="#rt-res-list">Skip to courses</a>
      <Preloader />
      <HomeHeader />
      {/* No overflow-hidden here: it would stop the filter panel from sticking. */}
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cat-main">
          <Suspense fallback={<CourseListSkeleton />}>
            <CourseCatalogue courses={page.courses} scope={page.scope} />
          </Suspense>
          <CourseTowns title={`Find ${page.label.replace(/ courses$/i, "").toLowerCase()} courses near you`} towns={getCourseTowns(page.slug)} />
          {page.guides.length > 0 && (
            <section className="rt-cpage__guides layout-pt-lg" aria-labelledby="rt-cpage-guides-h">
              <div className="container">
                <div className="row y-gap-20 justify-between items-end">
                  <div className="col-auto">
                    <h2 className="sectionTitle__title" id="rt-cpage-guides-h">Guides and advice</h2>
                    <p className="sectionTitle__text mt-5">Plain-English guides from our blog, checked against the official rules.</p>
                  </div>
                  <div className="col-auto">
                    <HomeTextLink href={`${BLOG_HREF}?category=${page.blog}`}>All guides</HomeTextLink>
                  </div>
                </div>
                <ul className="rt-blog__grid rt-cpage__guides-grid">
                  {page.guides.slice(0, 3).map((p) => (
                    <li key={p.slug}>
                      <PostCard post={p} />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
          <FaqSection eyebrow={page.label} title="Frequently asked questions" items={page.faq} idPrefix={`cpage-faq-${page.slug}`} />
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, page.href)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
    </div>
  );
}
