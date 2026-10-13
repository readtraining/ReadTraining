import React from "react";
import ProductFrame from "@/components/marketing/ProductFrame";
import { SKILL_SAVER_LEVELS } from "@/lib/skillSaver";

// A learner's Skill Saver level in a product frame: their level and discount, the three levels as a ladder, and the progress
// towards the next level (or a note at the top level). `status` comes from skillSaverStatus (lib/skillSaver.js). The learner
// page's hero shows an example; its "Your level" section shows the signed-in learner's own. `children` go at the bottom.
export default function SaverStatus({ title, greeting, status: s, children }) {
  const left = s.next ? s.next.courses - s.next.have : 0;
  return (
    <ProductFrame title={title} className="rt-sv__status">
      <div className="rt-ss__levelTop">
        <div>
          <span className="rt-ss__levelLabel">Skill Saver Level {s.level}</span>
          <b className="rt-ss__levelWho">{greeting}</b>
        </div>
        <div className="rt-ss__levelOff">{s.upTo && <span>up to</span>}<b>{s.discount}%</b><span>off Skill Saver courses</span></div>
      </div>

      <ol className="rt-sv__ladder" aria-label="Skill Saver levels">
        {SKILL_SAVER_LEVELS.map((l) => {
          const state = l.level < s.level ? "-done" : l.level === s.level ? "-current" : "";
          return (
            <li key={l.level} className={state} aria-current={l.level === s.level ? "step" : undefined}>
              <span className="rt-sv__stepBar" aria-hidden="true"></span>
              <b>Level {l.level}</b>
              <span>{l.upTo ? "Up to " : ""}{l.discount}% off</span>
            </li>
          );
        })}
      </ol>

      {s.next ? (
        <div className="rt-sv__next">
          <div className="rt-ss__statTop"><span>Progress to Level {s.next.level}</span><b>{s.next.have} of {s.next.courses} courses</b></div>
          <span className="fb-bar -lg" aria-hidden="true"><span style={{ width: `${(s.next.have / s.next.courses) * 100}%` }}></span></span>
          <p className="rt-sv__nextText">
            Complete {left} more course{left === 1 ? "" : "s"} to reach Level {s.next.level} and get {s.next.discount}% off. Counts courses completed in the last {s.next.years === 1 ? "year" : `${s.next.years} years`}.
          </p>
        </div>
      ) : (
        <p className="rt-ss__levelNote">You have reached the top level. Your {s.discount}% discount is yours for life.</p>
      )}
      {children}
    </ProductFrame>
  );
}
