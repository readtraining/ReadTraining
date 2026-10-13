import React from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/marketing/parts";

// "Where it can lead" (as /for-business's renewals section: .fb-split -reverse with the timeline, .fb-timeline): the career ladder
// from a first role to managing sites on the timeline; beside it the copy and the licences that widen the options, as links to
// those courses.
export default function JobsGrow({ grow: g }) {
  return (
    <section className="fb-section -white" aria-labelledby="rt-jobs-grow-h">
      <div className="container">
        <div className="fb-split -reverse">
          <div>
            <Eyebrow>{g.eyebrow}</Eyebrow>
            <h2 className="fb-title" id="rt-jobs-grow-h">{g.title}</h2>
            <p className="fb-lede">{g.text}</p>
            <h3 className="rt-jobs__need">{g.addTitle}</h3>
            <ul className="rt-jobs__adds">
              {g.adds.map((a) => (
                <li key={a.label}><Link href={a.href} className="rt-tr__filter">{a.label}<i className="icon-arrow-right text-11" aria-hidden="true"></i></Link></li>
              ))}
            </ul>
          </div>
          <ol className="fb-timeline rt-jobs__timeline">
            {g.steps.map((s) => (
              <li key={s.title} className="fb-timeline__item">
                <span className="fb-timeline__dot" aria-hidden="true"></span>
                <div className="fb-timeline__body">
                  <span className="fb-timeline__date">{s.level}</span>
                  <b>{s.title}</b>
                  <span>{s.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
