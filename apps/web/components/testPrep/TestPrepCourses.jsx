import React from "react";
import HomeCourseCard from "@/components/home/HomeCourseCard";
import HomeTextLink from "@/components/home/HomeTextLink";
import { getCoursesByIds, toCourseCard } from "@/lib/courses";
import { testPrepPage } from "@/data/testPrep";

// Courses that have a mock test on the hub: home's "Popular courses" layout (title left, text link right, four course cards).
export default function TestPrepCourses() {
  const c = testPrepPage.courses;
  const courses = getCoursesByIds(c.ids);
  if (!courses.length) return null;
  return (
    <section className="rt-tp__courses layout-pt-lg layout-pb-lg" aria-labelledby="rt-tp-courses-h">
      <div className="container">
        <div className="row y-gap-20 justify-between items-end">
          <div className="col-lg-8">
            <div className="rt-eyebrow rt-eyebrow--pill"><span className="rt-eyebrow__dot"></span>{c.eyebrow}</div>
            <h2 className="sectionTitle__title mt-20" id="rt-tp-courses-h">{c.title}</h2>
            <p className="sectionTitle__text mt-5">{c.text}</p>
          </div>
          <div className="col-auto">
            <HomeTextLink href={c.more.href}>{c.more.label}</HomeTextLink>
          </div>
        </div>
        <div className="row y-gap-30 pt-30">
          {courses.map((course) => (
            <HomeCourseCard key={course.id} data={toCourseCard(course)} href={course.detailsHref} />
          ))}
        </div>
      </div>
    </section>
  );
}
