import React from "react";
import Link from "next/link";
import HomeCourseCard from "@/components/home/HomeCourseCard";
import HomeTextLink from "@/components/home/HomeTextLink";
import { testPrepPage } from "@/data/testPrep";
import { CATALOGUE_HREF } from "@/lib/routes";
import { toCourseCard } from "@/lib/courses";

// "Ready to book your course?". A subject with matching courses shows them as home's course cards (the hub's courses
// section layout); a subject without one shows the business page's dark CTA band with "Book now" to the course catalogue.
export const BOOK_ID = "book";

export default function SubjectCourses({ courses }) {
  const t = testPrepPage.subject;
  if (!courses.length) {
    return (
      <section className="rt-tps__cta layout-pb-lg" id={BOOK_ID} aria-labelledby="rt-tps-book-h">
        <div className="container">
          <div className="bz-cta3">
            <div className="bz-cta3__text">
              <h2 className="bz-cta3__title" id="rt-tps-book-h">{t.bookTitle}</h2>
              <p className="bz-cta3__lede">{t.bookText}</p>
            </div>
            <div className="bz-cta3__actions">
              <Link href={CATALOGUE_HREF} className="button -md -purple-1 text-white">{t.bookLabel} <i className="icon-arrow-right text-13 ml-10" aria-hidden="true"></i></Link>
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="rt-tp__courses layout-pt-lg layout-pb-lg" id={BOOK_ID} aria-labelledby="rt-tps-book-h">
      <div className="container">
        <div className="row y-gap-20 justify-between items-end">
          <div className="col-lg-8">
            <h2 className="sectionTitle__title" id="rt-tps-book-h">{t.bookTitle}</h2>
            <p className="sectionTitle__text mt-5">{t.bookText}</p>
          </div>
          <div className="col-auto">
            <HomeTextLink href={t.coursesLink.href}>{t.coursesLink.label}</HomeTextLink>
          </div>
        </div>
        <div className="row y-gap-30 pt-30">
          {courses.map((c) => (
            <HomeCourseCard key={c.id} data={toCourseCard(c)} href={c.detailsHref} className="col-lg-4 col-md-6" />
          ))}
        </div>
      </div>
    </section>
  );
}
