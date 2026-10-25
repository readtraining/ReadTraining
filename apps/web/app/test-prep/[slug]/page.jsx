import React from "react";
import { notFound } from "next/navigation";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import FaqSection from "@/components/marketing/FaqSection";
import SubjectHero from "@/components/testPrep/subject/SubjectHero";
import SubjectActions from "@/components/testPrep/subject/SubjectActions";
import SubjectFacts from "@/components/testPrep/subject/SubjectFacts";
import SubjectMore from "@/components/testPrep/subject/SubjectMore";
import SubjectTests from "@/components/testPrep/subject/SubjectTests";
import SubjectArticle, { GUIDE_ID } from "@/components/testPrep/subject/SubjectArticle";
import SubjectCourses, { BOOK_ID } from "@/components/testPrep/subject/SubjectCourses";
import SubjectSlimBar from "@/components/testPrep/subject/SubjectSlimBar";
import SubjectReviews from "@/components/testPrep/subject/SubjectReviews";
import { TESTS_ID } from "@/components/testPrep/subject/scrollToTests";
import { testPrepPage } from "@/data/testPrep";
import { bookHref, getSubject, getSubjectCourses, getSubjectSlugs, moreSubjects, resolveTests, subjectHref } from "@/lib/testPrep";
import { loadCatalogue } from "@/lib/catalogueServer";
import { loadTaxonomy } from "@/lib/taxonomyServer";

// Test prep subject page (/test-prep/<slug>): one template for every subject, driven by data/testPrepSubjects.js.
// Order: slim bar (fixed, once the H1 has scrolled away, with "Start free test") > hero band (breadcrumb, category, H1, intro,
// "Start free test" + "Book a course") > key facts strip on the band's edge > mock exams (first) > the guide (pinned contents
// column + article) > more mock tests > FAQs > Ready to book your course? > Mock exam reviews. Phones: a bottom bar with the
// two actions once the hero's have scrolled away.

// "45 min", "1 hr 50 min": the compact form for the key facts strip, so the value stays on one line
const shortDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const abs = (path) => `${SITE_URL}${path}`;
const json = (data) => JSON.stringify(data).replace(/</g, "\\u003c");

export function generateStaticParams() {
  return getSubjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const s = getSubject(slug);
  if (!s) return { title: "Test not found | ReadTraining" };
  const title = `${s.title} | Free Mock Test | ReadTraining`;
  const description = s.lead.length > 160 ? `${s.lead.slice(0, 157).replace(/\s+\S*$/, "")}...` : s.lead;
  const path = subjectHref(slug);
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "ReadTraining", title, description, url: path },
    twitter: { card: "summary", title, description },
  };
}

export default async function TestPrepSubjectPage(props) {
  await loadTaxonomy(); // catalogue names (categories, methods) on the server
  const { slug } = await props.params;
  const s = getSubject(slug);
  if (!s) notFound();

  const t = testPrepPage.subject;
  const path = subjectHref(slug);
  const crumbs = [{ label: "Home", href: "/" }, { label: "Test Prep", href: "/test-prep" }, { label: s.title }];
  const courses = getSubjectCourses(slug, await loadCatalogue());
  const faqs = s.faqs || [];
  // The key facts strip: tests, questions (a "+" when some tests have no count yet, so it is never overstated), pass mark
  // (a range when the tests differ) and time (the longest when they differ).
  const k = t.keyFacts;
  const n = s.tests.length;
  const questions = n === 1 ? s.tests[0].questions : s.tests.reduce((sum, x) => sum + (x.questions || 0), 0);
  const partial = n > 1 && s.tests.some((x) => !x.questions);
  const marks = [...new Set(s.tests.map((x) => x.passMark).filter(Boolean))].sort((x, y) => x - y);
  const mins = [...new Set(s.tests.map((x) => x.minutes).filter(Boolean))].sort((x, y) => x - y);
  const keyFacts = [
    { icon: "icon-list", value: String(n), label: n === 1 ? k.test : k.tests },
    { icon: "icon-document", value: questions ? `${questions.toLocaleString("en-GB")}${partial ? "+" : ""}` : "", label: k.questions },
    { icon: "icon-badge", value: marks.length ? (marks.length === 1 ? `${marks[0]}%` : `${marks[0]}–${marks[marks.length - 1]}%`) : "", label: k.passMark },
    { icon: "icon-wall-clock", value: mins.length ? shortDuration(mins[mins.length - 1]) : "", label: mins.length > 1 ? k.longest : n > 1 ? k.timePerTest : k.time },
  ];
  const more = moreSubjects(slug).map((x) => ({ ...x, testCount: resolveTests(x.slug).length }));
  // The slim bar's links: the page's main blocks, each only when it is on the page.
  const slimLinks = [
    { id: TESTS_ID, label: "Mock exams" },
    s.sections.length > 0 && { id: GUIDE_ID, label: "Guide" },
    faqs.length > 0 && { id: "faqs", label: "FAQs" },
    { id: BOOK_ID, label: "Book a course" },
  ].filter(Boolean);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: abs(c.href || path) })),
  };
  const faqLd = faqs.length
    ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
    : null;

  return (
    <div className="main-content rt-home rt-tps-page">
      <a href="#rt-tps-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-tps-main" tabIndex={-1}>
          <SubjectSlimBar title={s.title} tag={t.cardEyebrow} facts={s.facts} links={slimLinks} startLabel={t.startLabel} />

          <SubjectHero crumbs={crumbs} title={s.title} lead={s.lead} label={s.category} top>
            <SubjectActions bookHref={bookHref(slug)} />
          </SubjectHero>

          <div className="rt-tps__page">
            <div className="container">
              <SubjectFacts facts={keyFacts} />
              <SubjectTests heading={s.mockHeading || `${s.title} ${t.mockHeadingSuffix}`} pageTitle={s.title} subject={slug} tests={s.tests} />
              <SubjectArticle sections={s.sections} />
              <SubjectMore items={more} />
            </div>
          </div>

          {faqs.length > 0 && <FaqSection eyebrow="FAQs" title={t.faqTitle} items={faqs} idPrefix="tps-faq" className="layout-pt-lg layout-pb-lg rt-tps__faq" id="faqs" />}

          <SubjectCourses courses={courses} />

          <SubjectReviews subject={slug} />
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(faqLd) }} />}
    </div>
  );
}
