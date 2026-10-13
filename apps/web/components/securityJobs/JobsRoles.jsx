import React from "react";
import { Eyebrow } from "@/components/marketing/parts";

// "Five kinds of security work" (#roles): the centred section head and one card per role in a row (home's team tiles, .rt-teamtile,
// on white), each with the licence it needs as a chip, a line on the work, and its typical shifts and setting.
export default function JobsRoles({ roles: r }) {
  return (
    <section id="roles" className="fb-section -white rt-jobs__anchor" aria-labelledby="rt-jobs-roles-h">
      <div className="container">
        <div className="fb-head -center">
          <Eyebrow>{r.eyebrow}</Eyebrow>
          <h2 className="fb-title" id="rt-jobs-roles-h">{r.title}</h2>
          <p className="fb-lede">{r.text}</p>
        </div>
        <ul className="rt-jobs__roles">
          {r.items.map((x) => (
            <li key={x.key} className="rt-teamtile rt-jobs__rolecard">
              <span className="rt-teamtile__icon" aria-hidden="true"><i className={`${x.icon} text-18`}></i></span>
              <h3 className="rt-teamtile__title">{x.title}</h3>
              <p className="rt-teamtile__text">{x.work}</p>
              <dl className="rt-jobs__roledl">
                <div><dt>{r.labels.licence}</dt><dd>{x.licence}</dd></div>
                <div><dt>{r.labels.shifts}</dt><dd>{x.shifts}</dd></div>
                <div><dt>{r.labels.where}</dt><dd>{x.where}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
