import React from "react";
import { notFound } from "next/navigation";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import HomeHelp from "@/components/home/HomeHelp";
import BookingProvider from "@/components/courseDetail/BookingProvider";
import BookingCard from "@/components/courseDetail/BookingCard";
import CourseHero from "@/components/courseDetail/CourseHero";
import SectionNav from "@/components/courseDetail/SectionNav";
import LearningOptions from "@/components/courseDetail/LearningOptions";
import ModulesAccordion from "@/components/courseDetail/ModulesAccordion";
import DatesSection from "@/components/courseDetail/DatesSection";
import ReviewsSection from "@/components/courseDetail/ReviewsSection";
import TrustBoxes from "@/components/courseDetail/TrustBoxes";
import RelatedCourses from "@/components/courseDetail/RelatedCourses";
import MobileBuyBar from "@/components/courseDetail/MobileBuyBar";
import { getCourseBySlug, getRelatedCourses, getSubjectLabel } from "@/lib/courses";

export async function generateMetadata(props) {
  const { id } = await props.params;
  const course = getCourseBySlug(id);
  if (!course) return { title: "Course not found | ReadTraining" };
  return {
    title: `${course.title} | ReadTraining`,
    description: course.summary,
    alternates: { canonical: `/template/courses/${course.id}` },
  };
}

const json = (data) => JSON.stringify(data).replace(/</g, "\\u003c");

const Check = () => (
  <svg className="rt-cd__check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.8" />
  </svg>
);

// Same sections, in the same order, as the live Hurak course page, in our own design:
// features > learning options > study options > overview > requirements > exams > what you will learn > course content >
// reviews > trust points > FAQs > students also bought > need help > footer. The booking card is sticky on the right.
export default async function page(props) {
  const { id } = await props.params;
  const query = (await props.searchParams) || {};
  const course = getCourseBySlug(id);
  if (!course) notFound();
  const related = getRelatedCourses(course);
  const subject = getSubjectLabel(course);
  const path = `/template/courses/${course.id}`;
  const prices = course.sessions.map((s) => s.price);
  const { workAreas, requirements, exams, comparison, apply } = course;

  const navSections = [
    { id: "learning-options", label: "Learning options" },
    { id: "overview", label: "Overview" },
    { id: "requirements", label: "Requirements" },
    { id: "content", label: "Course content" },
    { id: "faqs", label: "FAQs" },
  ];

  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.summary,
    provider: { "@type": "Organization", name: "ReadTraining" },
    offers: { "@type": "Offer", priceCurrency: "GBP", price: Math.min(...prices).toFixed(2), availability: "https://schema.org/InStock", url: path },
    aggregateRating: { "@type": "AggregateRating", ratingValue: course.rating, reviewCount: course.reviewCount },
  };
  const crumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: "All courses", item: "/template/courses-list-1" },
      ...(subject ? [{ "@type": "ListItem", position: 3, name: subject, item: `/template/courses-list-1?subject=${course.subject}` }] : []),
      { "@type": "ListItem", position: subject ? 4 : 3, name: course.title, item: path },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: course.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };

  return (
    <div className="main-content rt-home">
      <Preloader />
      <HomeHeader />
      {/* No overflow-hidden on any ancestor of the sticky card and nav. */}
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cd-main" className="rt-cd">
          <BookingProvider course={course} initialMode={query.mode} initialSession={query.session}>
            <div className="rt-cd__wrap">
              <div className="rt-cd__grid">
                <CourseHero course={course} />

                <aside className="rt-cd__aside" aria-label="Book this course">
                  <BookingCard />
                </aside>

                <div className="rt-cd__content">
                  <SectionNav sections={navSections} />

                  {course.features?.length > 0 && (
                    <section className="rt-cd__sec rt-cd__features" aria-labelledby="rt-cd-features-h">
                      <h2 id="rt-cd-features-h">Course features</h2>
                      <ul className="rt-cd__chips">
                        {course.features.slice(0, 5).map((f) => <li key={f}>{f}</li>)}
                      </ul>
                    </section>
                  )}

                  <LearningOptions />
                  <DatesSection />

                  <section className="rt-cd__sec" id="overview" aria-labelledby="rt-cd-overview-h">
                    <h2 id="rt-cd-overview-h">{course.title}</h2>
                    <div className="rt-cd__prose">
                      {course.description.map((p) => <p key={p}>{p}</p>)}
                    </div>
                    {workAreas && (
                      <>
                        <h3 className="rt-cd__h3">{workAreas.title}</h3>
                        <p>{workAreas.intro}</p>
                        <ul className="rt-cd__list">
                          {workAreas.items.map(([name, text]) => <li key={name}><strong>{name}</strong>: {text}</li>)}
                        </ul>
                        {workAreas.note && <p className="rt-cd__note">{workAreas.note}</p>}
                      </>
                    )}
                  </section>

                  <section className="rt-cd__sec" id="requirements" aria-labelledby="rt-cd-req-h">
                    <h2 id="rt-cd-req-h">{requirements.title}</h2>
                    <div className="rt-cd__prose">
                      {requirements.paragraphs.map((p) => <p key={p}>{p}</p>)}
                    </div>
                    {requirements.list?.length > 0 && (
                      <ul className="rt-cd__list">{requirements.list.map((r) => <li key={r}>{r}</li>)}</ul>
                    )}
                  </section>

                  {exams && (
                    <section className="rt-cd__sec" aria-labelledby="rt-cd-exams-h">
                      <h2 id="rt-cd-exams-h">{exams.title}</h2>
                      <div className="rt-cd__prose">
                        {exams.intro.map((p) => <p key={p}>{p}</p>)}
                      </div>
                      <div className="rt-cd__table-wrap">
                        <table className="rt-cd__table">
                          <thead>
                            <tr><th scope="col">Unit</th><th scope="col">Pass mark</th><th scope="col">Duration</th></tr>
                          </thead>
                          <tbody>
                            {exams.rows.map((r) => (
                              <tr key={r.unit}><td>{r.unit}</td><td>{r.passMark}</td><td>{r.duration}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="rt-cd__prose">
                        {exams.outro.map((p) => <p key={p}>{p}</p>)}
                      </div>
                    </section>
                  )}

                  {comparison && (
                    <section className="rt-cd__sec" aria-labelledby="rt-cd-cmp-h">
                      <h2 id="rt-cd-cmp-h">{comparison.title}</h2>
                      <div className="rt-cd__prose">
                        {comparison.paragraphs.map((p) => <p key={p}>{p}</p>)}
                      </div>
                    </section>
                  )}

                  {apply && (
                    <section className="rt-cd__sec" aria-labelledby="rt-cd-apply-h">
                      <h2 id="rt-cd-apply-h">{apply.title}</h2>
                      <p>{apply.intro}</p>
                      <ol className="rt-cd__steps">
                        {apply.steps.map((s) => <li key={s}>{s}</li>)}
                      </ol>
                      <div className="rt-cd__prose">
                        {apply.notes.map((n) => <p key={n}>{n}</p>)}
                      </div>
                    </section>
                  )}

                  <section className="rt-cd__sec" id="learn" aria-labelledby="rt-cd-learn-h">
                    <div className="rt-cd__learn">
                      <h2 id="rt-cd-learn-h">What you will learn</h2>
                      <ul className="rt-cd__checks">
                        {course.learningOutcomes.map((o) => <li key={o}><Check /> <span>{o}</span></li>)}
                      </ul>
                    </div>
                  </section>

                  <section className="rt-cd__sec" id="content" aria-labelledby="rt-cd-content-h">
                    <h2 id="rt-cd-content-h">Course content</h2>
                    <ModulesAccordion modules={course.modules} />
                  </section>

                  <ReviewsSection />
                  <TrustBoxes />

                  <section className="rt-cd__sec" id="faqs" aria-labelledby="rt-cd-faqs-h">
                    <h2 id="rt-cd-faqs-h">Frequently asked questions</h2>
                    <div className="rt-cd__faqs">
                      {course.faqs.map((f) => (
                        <details key={f.question} className="rt-cd__mod">
                          <summary className="rt-cd__mod-sum">
                            <span className="rt-cd__mod-title">{f.question}</span>
                            <svg className="rt-cd__chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                          </summary>
                          <p className="rt-cd__faq-a">{f.answer}</p>
                        </details>
                      ))}
                    </div>
                  </section>

                  <RelatedCourses courses={related} />
                </div>
              </div>
            </div>

            <MobileBuyBar />
          </BookingProvider>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(courseLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(crumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(faqLd) }} />
    </div>
  );
}
