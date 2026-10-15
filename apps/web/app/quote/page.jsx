import React from "react";
import Preloader from "@/components/common/Preloader";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFooter from "@/components/home/HomeFooter";
import MarketingHero from "@/components/marketing/MarketingHero";
import QuoteForm from "@/components/courseDetail/QuoteForm";
import { courseHref, getCourseBySlug } from "@/lib/courses";
import { QUOTE_HREF } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

// Group quote (/quote, ?course=<slug> from a course page): the Contact page's layout (marketing hero, then how it works beside
// the form in a frame), so it no longer stands out as a bare form. The form is QuoteForm (simulated sending: lib/quote.js).

const copy = {
  hero: { eyebrow: "Group training", title: ["Get a group quote"], lead: "Tell us how many people need training and we will reply within one working day." },
  how: {
    eyebrow: "How it works",
    title: "Training for your whole team",
    text: "One quote for everyone, on our dates or at your workplace.",
    steps: [
      { icon: "icon-person-3", title: "Tell us about your team", text: "How many people, which course and any dates or places that suit you." },
      { icon: "icon-wall-clock", title: "Get your quote in one working day", text: "A fixed price per person, with the venue and dates we can offer." },
      { icon: "icon-calendar", title: "Book and send your team", text: "Confirm by email. We send joining instructions to each learner." },
    ],
  },
  formTitle: "Your team's details",
};

export const metadata = pageMetadata({
  title: "Get a group quote | ReadTraining",
  description: "Tell us how many people need training and we will send a quote for your team within one working day.",
  path: QUOTE_HREF,
});

export default async function QuotePage(props) {
  const query = (await props.searchParams) || {};
  const course = query.course ? getCourseBySlug(String(query.course)) : null;
  const backHref = course ? courseHref(course.slug) : "/";
  const hero = course ? { ...copy.hero, lead: `Training your team on ${course.title}? ${copy.hero.lead}` } : copy.hero;

  return (
    <div className="main-content rt-home fb-page rt-tpage rt-contact-page">
      <a href="#rt-quote-main" className="rt-skip">Skip to main content</a>
      <Preloader />
      <HomeHeader />
      <div className="content-wrapper js-content-wrapper">
        <main id="rt-quote-main" tabIndex={-1}>
          <MarketingHero hero={hero} />
          <section className="fb-section -white" aria-labelledby="rt-quote-how-h">
            <div className="container">
              <div className="fb-split rt-contact__split">
                <div>
                  <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{copy.how.eyebrow}</div>
                  <h2 className="fb-title" id="rt-quote-how-h">{copy.how.title}</h2>
                  <p className="fb-lede">{copy.how.text}</p>
                  <ol className="rt-benefits rt-contact__channels">
                    {copy.how.steps.map((x) => (
                      <li key={x.title} className="rt-benefit">
                        <span className="rt-benefit__icon" aria-hidden="true"><i className={`${x.icon} text-16`}></i></span>
                        <div>
                          <h3 className="rt-benefit__title">{x.title}</h3>
                          <p className="rt-benefit__text">{x.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="fb-frame" id="quote-form">
                  <div className="fb-frame__body rt-contact__form">
                    <h2 className="rt-contact__form-title">{course ? `${copy.formTitle}: ${course.title}` : copy.formTitle}</h2>
                    <QuoteForm courseTitle={course?.title} backHref={backHref} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <HomeFooter />
      </div>
    </div>
  );
}
