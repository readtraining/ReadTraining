import React from "react";
import HomeCourseCard from "@/components/home/HomeCourseCard";
import { toCourseCard } from "@/lib/courses";

// "Students also bought": home's course card (.rt-ucard), three in a row.
export default function RelatedCourses({ courses }) {
  if (!courses.length) return null;
  return (
    <section className="rt-cd__sec" id="related" aria-labelledby="rt-cd-related-h">
      <h2 id="rt-cd-related-h">Students also bought</h2>
      <div className="row y-gap-20">
        {courses.map((c) => (
          <HomeCourseCard key={c.id} data={toCourseCard(c)} href={c.detailsHref} className="col-xl-4 col-md-6" />
        ))}
      </div>
    </section>
  );
}
