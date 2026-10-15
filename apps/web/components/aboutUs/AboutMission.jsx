import React from "react";

// "Our mission": the page's one dark band (.fb-section -dark), centred: the mission as a large quote at the section title step,
// then the bodies our courses lead to, in the footer's marks style (.rt-footer__marksList).
export default function AboutMission({ mission: m }) {
  return (
    <section className="fb-section -dark" aria-labelledby="rt-about-mission-h">
      <div className="container">
        <div className="fb-head -center rt-about__mission">
          <h2 className="rt-eyebrow rt-eyebrow--pill -onDark" id="rt-about-mission-h"><span className="rt-eyebrow__dot"></span>{m.eyebrow}</h2>
          <blockquote className="fb-title -onDark">{m.text}</blockquote>
          <p className="fb-lede -onDark">{m.marksLabel}</p>
          <ul className="rt-footer__marksList rt-about__marks">
            {m.accreditations.map((a) => <li key={a}><span>{a}</span></li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
