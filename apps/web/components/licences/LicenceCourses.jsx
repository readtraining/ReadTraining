import React from "react";
import Link from "next/link";
import HomeCourseCard from "@/components/home/HomeCourseCard";
import { Eyebrow } from "@/components/marketing/parts";

// "Training for this licence" (#training): the centred head and the catalogue courses that lead to it as the home page's course
// cards, with their "From" prices, then a link to the subject's courses. Nothing renders when no course is linked.
export default function LicenceCourses({ courses, training: t, copy }) {
  if (!courses.length) return null;
  return (
    <section className="fb-section -white rt-lic__anchor" id="training" aria-labelledby="rt-lic-train-h">
      <div className="container">
        <div className="fb-head -center">
          <Eyebrow>{copy.coursesEyebrow}</Eyebrow>
          <h2 className="fb-title" id="rt-lic-train-h">{t.title}</h2>
          {t.text && <p className="fb-lede">{t.text}</p>}
        </div>
        <div className="row y-gap-30 justify-center mt-30">
          {courses.map((c) => <HomeCourseCard key={c.id} data={c} />)}
        </div>
        {t.all && (
          <div className="rt-lic__more">
            <Link href={t.all.href} className="button -md -outline-purple-1 text-purple-1">{t.all.label}</Link>
          </div>
        )}
      </div>
    </section>
  );
}
