import React from "react";
import Link from "next/link";
import HomeCourseCard from "@/components/home/HomeCourseCard";
import { Eyebrow } from "@/components/marketing/parts";

// "Not licensed yet?": the centred head, the three steps from training to applying as numbered chips, and the SIA courses to book
// as the home page's cards (`courses`: the live SIA courses, lib/catalogueServer.js courseCards; none are shown while there are
// none), then all security courses.
export default function JobsTraining({ training: t, courses }) {
  return (
    <section id="training" className="fb-section -white rt-jobs__anchor" aria-labelledby="rt-jobs-train-h">
      <div className="container">
        <div className="fb-head -center">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2 className="fb-title" id="rt-jobs-train-h">{t.title}</h2>
          <p className="fb-lede">{t.text}</p>
        </div>
        <ol className="rt-jobs__train">
          {t.steps.map((s, i) => (
            <li key={s.title}>
              <span className="rt-jobs__qn" aria-hidden="true">{i + 1}</span>
              <div><b>{s.title}</b><span>{s.text}</span></div>
            </li>
          ))}
        </ol>
        {courses.length > 0 && (
          <div className="row y-gap-30 mt-30">
            {courses.map((c) => <HomeCourseCard key={c.id} data={c} />)}
          </div>
        )}
        <div className="rt-jobs__more">
          <Link href={t.all.href} className="button -md -outline-purple-1 text-purple-1">{t.all.label}</Link>
        </div>
      </div>
    </section>
  );
}
