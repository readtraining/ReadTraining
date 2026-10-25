import React from "react";
import HomeCourseCard from "@/components/home/HomeCourseCard";
import { toCourseCard } from "@/lib/courses";

// Courses to look at next: home's course card (.rt-ucard), three in a row. "Students also bought" only for the sample courses: a
// real course shows more courses from its category (`title`) until there are bookings to say what students bought.
export default function RelatedCourses({ courses, title = "Students also bought" }) {
  if (!courses.length) return null;
  return (
    <section className="rt-cd__sec" id="related" aria-labelledby="rt-cd-related-h">
      <h2 id="rt-cd-related-h">{title}</h2>
      <div className="row y-gap-20">
        {courses.map((c) => (
          <HomeCourseCard key={c.id} data={toCourseCard(c)} href={c.detailsHref} className="col-xl-4 col-md-6" />
        ))}
      </div>
    </section>
  );
}
