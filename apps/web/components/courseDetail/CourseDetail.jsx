import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import HomeHelp from "@/components/home/HomeHelp";
import BookingProvider from "@/components/courseDetail/BookingProvider";
import BookingCard from "@/components/courseDetail/BookingCard";
import CourseHero from "@/components/courseDetail/CourseHero";
import StatsCard from "@/components/courseDetail/StatsCard";
import SlimBar from "@/components/courseDetail/SlimBar";
import CourseFeatures from "@/components/courseDetail/CourseFeatures";
import LearningSection from "@/components/courseDetail/LearningSection";
import ClampBlock from "@/components/courseDetail/ClampBlock";
import ModulesAccordion from "@/components/courseDetail/ModulesAccordion";
import ReviewsSection from "@/components/courseDetail/ReviewsSection";
import TrustBoxes from "@/components/courseDetail/TrustBoxes";
import RelatedCourses from "@/components/courseDetail/RelatedCourses";
import MobileBuyBar from "@/components/courseDetail/MobileBuyBar";
import ArticleBlocks from "@/components/courseDetail/ArticleBlocks";
import CourseFaqs from "@/components/courseDetail/CourseFaqs";
import LongBody from "@/components/courseDetail/LongBody";
import MockTestBanner from "@/components/courseDetail/MockTestBanner";
import { Check } from "@/components/courseDetail/Icon";
import VenuesSection from "@/components/courseDetail/VenuesSection";
import { getRelatedCourses, getSubjectLabel } from "@/lib/courses";
import { abs, jsonLd } from "@/lib/seo";
import { CATALOGUE_HREF } from "@/lib/routes";

// Same sections, in the same order, as the live Hurak course page, in our own design:
// features > learning options > study options > overview > requirements > exams > what you will learn > course content >
// reviews > trust points > FAQs > students also bought > need help > footer. The booking card is sticky on the right.
// `path` is the page's own address (canonical and structured data); `query` is its search params (?mode=&session=). `local` is
// { city, venues } on a course-in-a-city page (/course-locations/...): the course's dates are already limited to that city, and
// its venues are listed under the learning options.
export default function CourseDetail({ course, query = {}, path, local = null }) {
  const related = getRelatedCourses(course);
  const subject = getSubjectLabel(course);
  const prices = course.sessions.map((s) => s.price);
  const { workAreas, requirements, exams, comparison, apply, article } = course;

  // Assessment and certificate data, as a two-column table. A row with no data is left out.
  const a = course.assessment || {};
  const c = course.certificate || {};
  const defRows = [
    ["Exam format", a.format], ["Number of questions", a.questions], ["Pass mark", a.passMark], ["Exam duration", a.duration],
    ["Open or closed book", a.openBook], ["Resit rules", a.resits],
    ["Certificate", c.name], ["Certificate validity", c.validityText], ["How to renew", c.renewal],
  ].filter(([, v]) => v !== undefined && v !== null && v !== "");

  const navSections = [
    { id: "learning-options", label: "Learning options" },
    { id: "overview", label: "Overview" },
    { id: "content", label: "Course content" },
    { id: "requirements", label: "Requirements" },
    { id: "faqs", label: "FAQs" },
  ];

  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.summary,
    provider: { "@type": "Organization", name: "ReadTraining" },
    url: abs(path),
    offers: { "@type": "Offer", priceCurrency: "GBP", price: Math.min(...prices).toFixed(2), availability: "https://schema.org/InStock", url: abs(path) },
    hasCourseInstance: course.sessions.slice(0, 20).map((x) => ({
      "@type": "CourseInstance",
      courseMode: x.mode === "classroom" ? "Onsite" : "Online",
      ...(x.mode === "ondemand" ? {} : { startDate: x.date, endDate: x.endDate }),
      ...(x.mode === "classroom" ? { location: { "@type": "Place", name: x.address, address: { "@type": "PostalAddress", addressLocality: x.city, postalCode: x.postcode, addressCountry: "GB" } } } : {}),
    })),
    aggregateRating: { "@type": "AggregateRating", ratingValue: course.rating, reviewCount: course.reviewCount },
  };
  const crumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
      { "@type": "ListItem", position: 2, name: "All courses", item: abs(CATALOGUE_HREF) },
      ...(subject ? [{ "@type": "ListItem", position: 3, name: subject, item: abs(`${CATALOGUE_HREF}?subject=${course.subject}`) }] : []),
      { "@type": "ListItem", position: subject ? 4 : 3, name: course.title, item: abs(path) },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: course.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };

  return (
    <div className="main-content rt-home">
      <a href="#rt-cd-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      {/* No overflow-hidden on any ancestor of the sticky card and nav. */}
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-cd-main" className="rt-cd" tabIndex={-1}>
          <BookingProvider course={course} initialMode={query.mode} initialSession={query.session}>
            <div className="container rt-cd__wrap">
              <div className="rt-cd__grid">
                <CourseHero course={course} />

                <aside className="rt-cd__aside" aria-label="Book this course">
                  <BookingCard />
                </aside>

                <div className="rt-cd__content">
                  <StatsCard course={course} />

                  <CourseFeatures features={course.features} />

                  <LearningSection />

                  {local && <VenuesSection city={local.city} venues={local.venues} course={course} />}

                  {article ? (
                    <ArticleBlocks blocks={article} part="intro" />
                  ) : (
                    <section className="rt-cd__sec" id="overview" aria-labelledby="rt-cd-overview-h">
                      <h2 id="rt-cd-overview-h">{course.title}</h2>
                      <ClampBlock>
                        <div className="rt-cd__prose">
                          {course.description.map((p) => <p key={p}>{p}</p>)}
                        </div>
                      </ClampBlock>
                    </section>
                  )}

                  <MockTestBanner test={course.mockTest} />

                  {course.learningOutcomes.length > 0 && (
                  <section className="rt-cd__sec" id="learn" aria-labelledby="rt-cd-learn-h">
                    <div className="rt-cd__learn">
                      <h2 id="rt-cd-learn-h">What you will learn</h2>
                      <ul className={`rt-cd__checks${course.learningOutcomes.length <= 5 ? " is-one" : ""}`}>
                        {course.learningOutcomes.map((o) => <li key={o}><Check /> <span>{o}</span></li>)}
                      </ul>
                    </div>
                  </section>
                  )}

                  <section className="rt-cd__sec" id="content" aria-labelledby="rt-cd-content-h">
                    <ModulesAccordion modules={course.modules} title="Course content" titleId="rt-cd-content-h" />
                  </section>

                  {article ? (
                    <ArticleBlocks blocks={article} part="rest" />
                  ) : (
                    <>
                  {workAreas && (
                    <section className="rt-cd__sec" id="work-areas" aria-labelledby="rt-cd-work-h">
                      <h3 className="rt-cd__h3" id="rt-cd-work-h">{workAreas.title}</h3>
                      <LongBody>
                        <p>{workAreas.intro}</p>
                        <ul className="rt-cd__list">
                          {workAreas.items.map(([name, text]) => <li key={name}><strong>{name}</strong>: {text}</li>)}
                        </ul>
                        {workAreas.note && <p className="rt-cd__note">{workAreas.note}</p>}
                      </LongBody>
                    </section>
                  )}

                  <section className="rt-cd__sec" id="requirements" aria-labelledby="rt-cd-req-h">
                    <h2 id="rt-cd-req-h">{requirements.title}</h2>
                      <LongBody>
                    <div className="rt-cd__prose">
                      {requirements.paragraphs.map((p) => <p key={p}>{p}</p>)}
                    </div>
                    {requirements.list?.length > 0 && (
                      <ul className="rt-cd__list">{requirements.list.map((r) => <li key={r}>{r}</li>)}</ul>
                    )}
                      </LongBody>
                  </section>

                  {!apply && defRows.length > 0 && (
                    <section className="rt-cd__sec" aria-labelledby="rt-cd-assess-h">
                      <h2 id="rt-cd-assess-h">Assessment and certificate</h2>
                      <dl className="rt-cd__defs">
                        {defRows.map(([label, value]) => (
                          <div key={label} className="rt-cd__def">
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}

                  {exams && (
                    <section className="rt-cd__sec" aria-labelledby="rt-cd-exams-h">
                      <h2 id="rt-cd-exams-h">{exams.title}</h2>
                      <LongBody>
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
                      </LongBody>
                    </section>
                  )}

                  {comparison && (
                    <section className="rt-cd__sec" aria-labelledby="rt-cd-cmp-h">
                      <h2 id="rt-cd-cmp-h">{comparison.title}</h2>
                      <LongBody>
                      <div className="rt-cd__prose">
                        {comparison.paragraphs.map((p) => <p key={p}>{p}</p>)}
                      </div>
                      </LongBody>
                    </section>
                  )}

                  {apply && (
                    <section className="rt-cd__sec" aria-labelledby="rt-cd-apply-h">
                      <h2 id="rt-cd-apply-h">{apply.title}</h2>
                      <LongBody>
                      <p>{apply.intro}</p>
                      <ol className="rt-cd__steps">
                        {apply.steps.map((s) => <li key={s}>{s}</li>)}
                      </ol>
                      <div className="rt-cd__prose">
                        {apply.notes.map((n) => <p key={n}>{n}</p>)}
                      </div>
                      </LongBody>
                    </section>
                  )}

                  {course.sections?.length > 0 && <ArticleBlocks blocks={course.sections} part="rest" />}
                    </>
                  )}

                  {course.showAudience && course.audience?.length > 0 && (
                    <section className="rt-cd__sec" aria-labelledby="rt-cd-aud-h">
                      <div className="rt-cd__learn">
                        <h2 id="rt-cd-aud-h">Who is this course for?</h2>
                        <ul className="rt-cd__checks is-one">
                          {course.audience.map((o) => <li key={o}><Check /> <span>{o}</span></li>)}
                        </ul>
                      </div>
                    </section>
                  )}

                  <ReviewsSection />
                  <TrustBoxes />

                  <section className="rt-cd__sec" id="faqs" aria-labelledby="rt-cd-faqs-h">
                    <h2 id="rt-cd-faqs-h">Frequently asked questions</h2>
                    <CourseFaqs faqs={course.faqs} />
                  </section>


                  <RelatedCourses courses={related} />
                </div>
              </div>
            </div>

            <SlimBar sections={navSections} />
            <MobileBuyBar />
          </BookingProvider>
        </main>
        <HomeHelp />
        <HomeFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(courseLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }} />
    </div>
  );
}
