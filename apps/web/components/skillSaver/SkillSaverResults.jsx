import React from "react";
import { Eyebrow } from "@/components/marketing/parts";

// "What partners can expect": the centred section head and the three expected averages as stat cards.
export default function SkillSaverResults({ results: r }) {
  return (
    <section className="fb-section -white" aria-labelledby="rt-ss-results-h">
      <div className="container">
        <div className="fb-head -center">
          <Eyebrow>{r.eyebrow}</Eyebrow>
          <h2 className="fb-title" id="rt-ss-results-h">{r.title}</h2>
          <p className="fb-lede">{r.text}</p>
        </div>
        <ul className="rt-ss__results">
          {r.items.map((x) => (
            <li key={x.label}>
              <strong>{x.value}</strong>
              <span>{x.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
