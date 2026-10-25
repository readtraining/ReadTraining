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
import TrustBoxes from "@/components/courseDetail/TrustBoxes";
import RelatedCourses from "@/components/courseDetail/RelatedCourses";
import MobileBuyBar from "@/components/courseDetail/MobileBuyBar";
import CourseFaqs from "@/components/courseDetail/CourseFaqs";
import LongBody from "@/components/courseDetail/LongBody";
import MockTestBanner from "@/components/courseDetail/MockTestBanner";
import { Check } from "@/components/courseDetail/Icon";
import CourseProviders from "@/components/courseDetail/CourseProviders";
import { getSubjectLabel } from "@/lib/courses";
import { abs, jsonLd } from "@/lib/seo";
import { CATALOGUE_HREF } from "@/lib/routes";

// Same sections, in the same order, as the live Hurak course page, in our own design:
// features > learning options > training providers > overview > what you will learn > course content > requirements > exams >
// who it's for > trust points > the provider's terms > FAQs > more courses > need help > footer. The booking card is sticky on
// the right. `course`: a live course (lib/catalogueData.js toCourseDetail); a section it has nothing for is left out, and
// nothing it doesn't have yet (ratings, reviews) is shown. `path` is the page's own address (canonical and structured data);
// `query` is its search params (?mode=&session=).
export default function CourseDetail({ course, query = {}, path }) {
  const subject = getSubjectLabel(course);
  const prices = course.sessions.map((s) => s.price);
  const { requirements, exams } = course;

  const navSections = [
    { id: "learning-options", label: "Learning options" },
    { id: "overview", label: "Overview" },
    ...(course.modules.length ? [{ id: "content", label: "Course content" }] : []),
    { id: "requirements", label: "Requirements" },
    ...(course.faqs.length ? [{ id: "faqs", label: "FAQs" }] : []),
  ];

  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.summary,
    provider: { "@type": "Organization", name: "ReadTraining" },
    url: abs(path),
    ...(prices.length ? { offers: { "@type": "Offer", priceCurrency: "GBP", price: Math.min(...prices).toFixed(2), availability: "https://schema.org/InStock", url: abs(path) } } : {}),
    hasCourseInstance: course.sessions.slice(0, 20).map((x) => ({
      "@type": "CourseInstance",
      courseMode: x.mode === "classroom" ? "Onsite" : "Online",
      ...(x.mode === "ondemand" ? {} : { startDate: x.date, endDate: x.endDate }),
      ...(x.mode === "classroom" ? { location: { "@type": "Place", name: x.address, address: { "@type": "PostalAddress", addressLocality: x.city, postalCode: x.postcode, addressCountry: "GB" } } } : {}),
    })),
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

                  <CourseProviders course={course} />

                  <section className="rt-cd__sec" id="overview" aria-labelledby="rt-cd-overview-h">
                    <h2 id="rt-cd-overview-h">{course.title}</h2>
                    {course.video && (
                      <div className="rt-cd__video">
                        <iframe src={course.video} title={`Video: ${course.title}`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                      </div>
                    )}
                    <ClampBlock>
                      <div className="rt-cd__prose">
                        {course.description.map((p) => <p key={p}>{p}</p>)}
                      </div>
                    </ClampBlock>
                  </section>

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

                  {course.modules.length > 0 && (
                  <section className="rt-cd__sec" id="content" aria-labelledby="rt-cd-content-h">
                    <ModulesAccordion modules={course.modules} title="Course content" titleId="rt-cd-content-h" />
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

                  <TrustBoxes />

                  {course.provider && (course.provider.bookingTerms || course.provider.cancellationPolicy) && (
                    <section className="rt-cd__sec" id="terms" aria-labelledby="rt-cd-terms-h">
                      <h2 id="rt-cd-terms-h">{course.provider.name}: booking terms</h2>
                      <LongBody>
                        <div className="rt-cd__prose">
                          {course.provider.cancellationPolicy && <><h3 className="rt-cd__h3">Cancellation policy</h3>{course.provider.cancellationPolicy.split(/\n\s*\n/).map((p) => <p key={p}>{p}</p>)}</>}
                          {course.provider.bookingTerms && <><h3 className="rt-cd__h3">Booking terms</h3>{course.provider.bookingTerms.split(/\n\s*\n/).map((p) => <p key={p}>{p}</p>)}</>}
                        </div>
                      </LongBody>
                    </section>
                  )}

                  {course.faqs.length > 0 && (
                  <section className="rt-cd__sec" id="faqs" aria-labelledby="rt-cd-faqs-h">
                    <h2 id="rt-cd-faqs-h">Frequently asked questions</h2>
                    <CourseFaqs faqs={course.faqs} />
                  </section>
                  )}

                  <RelatedCourses courses={course.related} title={subject ? `More ${subject.toLowerCase()} courses` : "More courses"} />
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
