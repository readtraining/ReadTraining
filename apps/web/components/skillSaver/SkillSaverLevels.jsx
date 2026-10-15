"use client";
import React, { useState } from "react";
import ProductFrame from "@/components/marketing/ProductFrame";
import { Eyebrow, Ticks } from "@/components/marketing/parts";

// "Meet your Skill Savers" (as /for-business's assign demo: copy left, product frame right). The frame switches between the
// three learner levels (.fb-seg): who qualifies, the discount they get, and how much more loyal they are, as bars (.fb-bar).
export default function SkillSaverLevels({ levels: l }) {
  const [active, setActive] = useState(l.items.length - 1);
  const x = l.items[active];
  return (
    <section id="rt-ss-levels" className="fb-section -lavender" aria-labelledby="rt-ss-levels-h">
      <div className="container">
        <div className="fb-split">
          <div>
            <Eyebrow>{l.eyebrow}</Eyebrow>
            <h2 className="fb-title" id="rt-ss-levels-h">{l.title}</h2>
            <p className="fb-lede">{l.text}</p>
            <Ticks items={l.points} />
          </div>

          <ProductFrame title={l.frame}>
            <div className="fb-seg rt-ss__seg" role="group" aria-label="Choose a learner level">
              {l.items.map((it, i) => (
                <button key={it.level} type="button" className="fb-seg__btn" aria-pressed={active === i} onClick={() => setActive(i)}>Level {it.level}</button>
              ))}
            </div>

            <div className="rt-ss__level" aria-live="polite">
              <div className="rt-ss__levelTop">
                <div>
                  <span className="rt-ss__levelLabel">Skill Saver Level {x.level}</span>
                  <b className="rt-ss__levelWho">{x.who}</b>
                </div>
                <div className="rt-ss__levelOff">{x.upTo && <span>up to</span>}<b>{x.discount}</b><span>discount</span></div>
              </div>
              {x.stats.length > 0 && (
                <ul className="rt-ss__stats">
                  {x.stats.map((s) => (
                    <li key={s.label}>
                      <div className="rt-ss__statTop"><span>{s.label}</span><b>{s.value}%</b></div>
                      <span className="fb-bar -lg" aria-hidden="true"><span style={{ width: `${s.value}%` }}></span></span>
                    </li>
                  ))}
                </ul>
              )}
              {x.note && <p className="rt-ss__levelNote">{x.note}</p>}
            </div>
          </ProductFrame>
        </div>
      </div>
    </section>
  );
}
