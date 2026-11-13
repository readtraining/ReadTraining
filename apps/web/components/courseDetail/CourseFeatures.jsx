import React from "react";
import { Icon } from "./Icon";

// Course features: the course's key facts as a plain list (an icon and its words, two columns from tablet width, one on phones),
// information only, so nothing looks clickable. The icon is picked from the wording, as the client's own page marks its facts
// (📅 the course, 🎓 the award, 🪪 the licence): the first rule that matches wins, so a cost ("£204 SIA licence fee") is money
// before it is a licence, mock exams are study materials before they are exams, and an award ("Ofqual regulated") is a
// qualification before it is a standard; anything unrecognised gets a tick. Glyphs from the site's icon font (the same as home).
const RULES = [
  [/£|\bfee\b|price|cost|cheap|save|discount/i, "save-money"],
  [/result|same-day|fast|quick/i, "wall-clock"],
  [/mock|study guide|materials|resources|e-?learning/i, "book"],
  [/exam|assessment|test\b/i, "document"],
  [/licen[cs]e/i, "badge"],
  [/\bvalid\b|validity|renew|expire|refresher/i, "time-management"],
  [/level \d|award|certificate|diploma|qualif/i, "graduate-cap"],
  [/\bhse\b|ofqual|approved|accredit|regulat|complian|guidance|standard|\bcpd\b|\biso\b/i, "badge"],
  [/classroom|online|self-paced|full-time|part-time|\bday\b|days|week|hours/i, "calendar"],
  [/minimum age|age \d|\bage\b|trainer|tutor|support|experienced/i, "person-3"],
  [/location|venue|uk-wide|nationwide|near you/i, "location"],
];
const iconFor = (text) => RULES.find(([re]) => re.test(text))?.[1] || "check";

export default function CourseFeatures({ features }) {
  if (!features?.length) return null;
  return (
    <section className="rt-cd__fcard" aria-labelledby="rt-cd-features-h">
      <h2 id="rt-cd-features-h">Course features</h2>
      <ul className="rt-fx">
        {features.map((f) => (
          <li key={f}>
            <span className="rt-fx__icon" aria-hidden="true"><Icon name={iconFor(f)} /></span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
