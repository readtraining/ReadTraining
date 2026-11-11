import React from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import HomeTextLink from "@/components/home/HomeTextLink";
import FaqSection from "@/components/marketing/FaqSection";
import CourseCatalogue from "@/components/courses/CourseCatalogue";
import PostCard from "@/components/blog/PostCard";
import CourseTowns from "@/components/courses/CourseTowns";
import { getCoursePage, getCourseTowns, midSentence } from "@/lib/coursePages";
import { BLOG_HREF } from "@/lib/blog";
import { faqItems } from "@/lib/siteContent";
import { loadSiteContent } from "@/lib/siteContentServer";
import { breadcrumbLd, faqPageLd, jsonLd, pageMetadata } from "@/lib/seo";
import { CATALOGUE_HREF } from "@/lib/routes";
import { loadTaxonomy } from "@/lib/taxonomyServer";
import { loadCatalogue } from "@/lib/catalogueServer";

// the real catalogue (every live listing), as the pages read it
const realCourses = loadCatalogue;

// A course page (/courses/<slug>: a study method, a subject or a set of courses, from the footer's "Find a course"): the course
// catalogue scoped to the page (its title and intro in the hero, links to the other course pages, the same search, filters,
// sorting and cards as All courses), then the towns with a venue (each with its own town page), the blog's guides on the topic, the page's FAQs, need help and the footer.
// Every category of the catalogue list has one. Copy: data/coursePages.js; reads: lib/coursePages.js, on the real courses.
// Rendered for each request, as All courses (app/courses/page.jsx), so it arrives with its courses for the address it was asked
// for; none is built ahead of time (the API isn't running while the site is built).

export async function generateMetadata(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const page = getCoursePage(slug, await realCourses());
  if (!page) return { title: "Courses not found | ReadTraining" };
  // a page with no live course yet ("No courses here yet") is kept out of search until one is listed
  return pageMetadata({ title: `${page.title} | ReadTraining`, description: page.description, path: page.href, noindex: !page.courses.length });
}

export default async function CoursePage(props) {
  await connection();
  await Promise.all([loadTaxonomy(), loadSiteContent()]); // catalogue names (categories, methods) and the site's content, on the server
  const { slug } = await props.params;
  const courses = await realCourses();
  const page = getCoursePage(slug, courses);
  if (!page) notFound();
  const faq = faqItems(`course-page-${slug}`, page.faq);
  const crumbs = [{ label: "Home", href: "/" }, { label: "All courses", href: CATALOGUE_HREF }, { label: page.label }];

  return (
    <div className="main-content rt-home rt-cat-page">
      <a className="rt-skip" href="#rt-res-list">Skip to courses</a>
      <Preloader />
      <HomeHeader />
      {/* No overflow-hidden here: it would stop the filter panel from sticking. */}
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cat-main">
          <CourseCatalogue courses={page.courses} scope={page.scope} />
          <CourseTowns title={`Find ${midSentence(page.title)} near you`} towns={getCourseTowns(page.slug, courses)} />
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
          {/* a subject with no questions written for it yet (admin › Site content › FAQs) has no FAQ section */}
          {faq.length > 0 && <FaqSection eyebrow={page.label} title="Frequently asked questions" items={faq} idPrefix={`cpage-faq-${page.slug}`} />}
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs, page.href)) }} />
      {faq.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageLd(faq)) }} />}
    </div>
  );
}
