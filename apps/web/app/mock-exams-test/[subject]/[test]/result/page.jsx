import React from "react";
import { notFound } from "next/navigation";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import SubjectHero from "@/components/testPrep/subject/SubjectHero";
import ResultView from "@/components/testPrep/runner/ResultView";
import { testPrepPage } from "@/data/testPrep";
import { getSubjectSlugs, resolveTests } from "@/lib/testPrep";
import { getTest } from "@/lib/testPrepRunner";

// The result of a mock test (/mock-exams-test/<subject>/<test>/result). The page is a shell; the last finished attempt on
// this device is marked on the server and shown by ResultView. Not indexed: it is personal to the learner.

export function generateStaticParams() {
  return getSubjectSlugs().flatMap((subject) => resolveTests(subject).filter((t) => t.ready).map((t) => ({ subject, test: t.slug })));
}

export async function generateMetadata(props) {
  const { subject, test } = await props.params;
  const hit = getTest(subject, test);
  if (!hit?.test.ready) return { title: "Test not found | ReadTraining" };
  return {
    title: `${testPrepPage.result.eyebrow}: ${hit.test.title} | ReadTraining`,
    robots: { index: false, follow: false },
  };
}

export default async function MockTestResultPage(props) {
  const { subject: subjectSlug, test: testSlug } = await props.params;
  const hit = getTest(subjectSlug, testSlug);
  if (!hit?.test.ready) notFound();
  const { subject, test, links } = hit;
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Test Prep", href: "/test-prep" },
    { label: subject.title, href: links.subject },
    { label: test.title, href: links.test },
    { label: testPrepPage.result.crumb },
  ];

  return (
    <div className="main-content rt-home rt-tq-page">
      <Preloader />
      <a href="#main" className="rt-skip">Skip to main content</a>
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="main" tabIndex={-1}>
          <SubjectHero crumbs={crumbs} title={test.title} />
          <section className="rt-tps__body rt-tq" aria-label={testPrepPage.result.eyebrow}>
            <div className="container">
              <ResultView subject={{ slug: subject.slug }} test={{ slug: test.slug }} links={links} />
            </div>
          </section>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
    </div>
  );
}
