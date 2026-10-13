import React from "react";
import { CtaLink, Eyebrow } from "@/components/marketing/parts";
import { SKILL_SAVER_LEVELS } from "@/lib/skillSaver";

// "The levels" on the learner Skill Saver page: the three levels as cards (the discount, then how to reach it), the top level
// marked, and a way into the catalogue. Numbers from lib/skillSaver.js.
export default function SaverLevels({ levels: l }) {
  const top = SKILL_SAVER_LEVELS.length;
  return (
    <section id="rt-sv-levels" className="fb-section -lavender" aria-labelledby="rt-sv-levels-h">
      <div className="container">
        <div className="fb-head -center">
          <Eyebrow>{l.eyebrow}</Eyebrow>
          <h2 className="fb-title" id="rt-sv-levels-h">{l.title}</h2>
          <p className="fb-lede">{l.text}</p>
        </div>
        <ol className="rt-sv__levels">
          {SKILL_SAVER_LEVELS.map((x) => (
            <li key={x.level} className={`rt-sv__card${x.level === top ? " -top" : ""}`}>
              <div className="rt-sv__cardHead">
                <span className="rt-ss__levelLabel">Level {x.level}</span>
                {x.level === 1 && <span className="fb-chip -muted">Starting level</span>}
                {x.level === top && <span className="fb-chip -info">Biggest saving</span>}
              </div>
              <div className="rt-sv__cardOff">
                <span className="rt-sv__cardUpTo">{x.upTo ? "Up to" : ""}</span>
                <b>{x.discount}%</b>
                <span>off Skill Saver courses</span>
              </div>
              <div className="rt-sv__cardRule">
                <span className="rt-sv__cardRuleLabel">How to reach it</span>
                <span>{x.rule}</span>
              </div>
            </li>
          ))}
        </ol>
        <div className="fb-actions -center">
          <CtaLink link={l.cta} />
        </div>
      </div>
    </section>
  );
}
