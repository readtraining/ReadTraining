import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeHelp from "@/components/home/HomeHelp";
import HomeFooter from "@/components/home/HomeFooter";
import SubjectHero from "@/components/testPrep/subject/SubjectHero";
import TestRunner from "@/components/testPrep/runner/TestRunner";
import CommentButton from "@/components/testPrep/runner/CommentButton";
import SubjectCourses from "@/components/testPrep/subject/SubjectCourses";
import { testPrepPage } from "@/data/testPrep";
import { bookHref, formatDuration, getSubject, getSubjectCourses, getSubjectSlugs, passCount, resolveTests, subjectHref } from "@/lib/testPrep";
import { getPaper, getTest } from "@/lib/testPrepRunner";

// A single mock test (/mock-exams-test/<subject>/<test>). A test with questions opens the test runner (the paper is sent
// without answers; marking happens on the server). As on the reference (hurak.com/mock-exams-test/...): a compact flat band
// (breadcrumb + title), "Book a course" and "Leave a comment" beside the test, then "Ready to book your course?" and
// "Still looking for an answer?" under it. A test without questions yet shows a "coming soon" page in the site's
// design (never a 404) with the paper's facts and the way back to the subject.

export function generateStaticParams() {
  return getSubjectSlugs().flatMap((subject) => resolveTests(subject).map((t) => ({ subject, test: t.slug })));
}

const find = (subjectSlug, testSlug) => {
  const subject = getSubject(subjectSlug);
  const test = subject?.tests.find((t) => t.slug === testSlug);
  return subject && test ? { subject, test } : null;
};

export async function generateMetadata(props) {
  const { subject, test } = await props.params;
  const hit = find(subject, test);
  if (!hit) return { title: "Test not found | ReadTraining" };
  return {
    title: `${hit.test.title} | ${hit.test.ready ? "Free Mock Test" : testPrepPage.comingSoon.eyebrow} | ReadTraining`,
    description: `${hit.test.title}: a free ${hit.subject.title} practice test from ReadTraining.`,
    alternates: { canonical: `/mock-exams-test/${subject}/${test}` },
    robots: hit.test.ready ? undefined : { index: false, follow: true },
  };
}

export default async function MockTestPage(props) {
  const { subject: subjectSlug, test: testSlug } = await props.params;
  const hit = find(subjectSlug, testSlug);
  if (!hit) notFound();
  const { subject, test } = hit;
  const c = testPrepPage.comingSoon;
  const paper = test.ready ? getPaper(subject.slug, test.slug) : null;
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Test Prep", href: "/test-prep" },
    { label: subject.title, href: subjectHref(subject.slug) },
    { label: test.title },
  ];
  const facts = [
    test.questions ? `${test.questions} questions` : null,
    test.passMark ? `Pass mark ${test.passMark}%${test.questions ? ` (${passCount(test.questions, test.passMark)} correct)` : ""}` : null,
    test.minutes ? formatDuration(test.minutes) : null,
  ].filter(Boolean);

  if (paper) {
    const { links } = getTest(subject.slug, test.slug);
    // the intro's key facts strip (the subject page's): questions, pass mark (with the correct answers needed), time limit
    const kf = testPrepPage.runner.keyFacts;
    const short = (m) => [Math.floor(m / 60) ? `${Math.floor(m / 60)} hr` : "", m % 60 ? `${m % 60} min` : ""].filter(Boolean).join(" ");
    const keyFacts = [
      { icon: "icon-document", value: test.questions ? String(test.questions) : String(paper.length), label: kf.questions },
      { icon: "icon-badge", value: test.passMark ? `${test.passMark}%` : "", label: test.passMark ? `${kf.passMark} · ${kf.correct.replace("{n}", passCount(test.questions || paper.length, test.passMark))}` : kf.passMark },
      { icon: "icon-wall-clock", value: test.minutes ? short(test.minutes) : kf.noLimit, label: kf.time },
    ];
    return (
      <div className="main-content rt-home rt-tq-page">
        <Preloader />
        <a href="#main" className="rt-skip">Skip to main content</a>
        <HomeHeader />
        <div className="content-wrapper js-content-wrapper">
          <main id="main" tabIndex={-1}>
            <SubjectHero crumbs={crumbs} title={test.title} />
            <section className="rt-tps__body rt-tq" aria-label={test.title}>
              <div className="container">
                <div className="rt-tq__tools">
                  <Link href={bookHref(subject.slug)} className="button -md -outline-purple-1 text-purple-1">{c.bookLabel}</Link>
                  <CommentButton subject={subject.slug} test={test.slug} className="button -md -outline-purple-1 text-purple-1" />
                </div>
                <TestRunner
                  subject={{ slug: subject.slug, title: subject.title }}
                  test={{ slug: test.slug, title: test.title, minutes: test.minutes, passMark: test.passMark }}
                  keyFacts={keyFacts}
                  questions={paper}
                  links={{ result: links.result }}
                />
              </div>
            </section>

            {/* under the test: hidden while the test runs (body.rt-tq-running), shown on the intro */}
            <div className="rt-tq__after">
            <SubjectCourses courses={getSubjectCourses(subject.slug)} />

            <section className="rt-tq__ask layout-pb-lg" aria-labelledby="rt-tq-ask-h">
              <div className="container">
                <div className="rt-tps__rvempty">
                  <span className="rt-benefit__icon" aria-hidden="true"><i className="icon-message text-16"></i></span>
                  <div className="rt-tps__rvempty-text">
                    <h2 className="rt-tps__rvempty-title" id="rt-tq-ask-h">{testPrepPage.comments.boxTitle}</h2>
                    <p className="rt-tps__rvempty-sub">{testPrepPage.comments.boxText}</p>
                  </div>
                  <CommentButton subject={subject.slug} test={test.slug} className="button -md -purple-1 text-white" />
                </div>
              </div>
            </section>
            </div>
          </main>
          <HomeHelp />
          <HomeFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="main-content rt-home">
      <Preloader />
      <a href="#main" className="rt-skip">Skip to main content</a>
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="main" tabIndex={-1}>
          <SubjectHero crumbs={crumbs} title={test.title} />
          <section className="rt-tps__body rt-tps__soon" aria-labelledby="rt-tps-soon-h">
            <div className="container">
              <div className="rt-tps__soon-card">
                <span className="rt-benefit__icon" aria-hidden="true"><i className="icon-wall-clock text-16"></i></span>
                <span className="rt-pill -accent">{c.eyebrow}</span>
                <h2 className="rt-tps__h2" id="rt-tps-soon-h">{c.title}</h2>
                <p className="rt-tps__soon-text">{c.text}</p>
                {facts.length > 0 && (
                  <ul className="rt-tps__facts">
                    {facts.map((f) => <li key={f}><i className="icon-check rt-cd__check" aria-hidden="true"></i>{f}</li>)}
                  </ul>
                )}
                <div className="rt-tps__soon-actions">
                  <Link href={subjectHref(subject.slug)} className="button -md -purple-1 text-white">{c.backLabel}</Link>
                  <Link href={bookHref(subject.slug)} className="button -md -outline-purple-1 text-purple-1">{c.bookLabel}</Link>
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
