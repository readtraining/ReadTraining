import React from "react";
import { Icon } from "./Icon";

// Course features, the way Hurak shows them: a heading, then one row of rounded badges, each an icon plus its text.
// The icon is picked from the wording; anything unrecognised gets a tick.
// Icon-font glyph per kind of feature (the same glyphs as home).
const ICONS = { refresh: "check", clock: "wall-clock", award: "badge", tag: "save-money", shield: "check", user: "person-3", star: "star", pin: "location", check: "check" };
const RULES = [
  [/resit/i, "refresh"],
  [/result|fast|quick(er)? (cert)?/i, "clock"],
  [/certif|qualif|licen[cs]e/i, "award"],
  [/cheap|price|save|discount/i, "tag"],
  [/approved|accredit|compliant|regulat/i, "shield"],
  [/own pace|trainer|tutor|experienced|support/i, "user"],
  [/review|rated|star/i, "star"],
  [/location|venue|uk-wide|nationwide/i, "pin"],
];
const iconFor = (text) => RULES.find(([re]) => re.test(text))?.[1] || "check";

export default function CourseFeatures({ features }) {
  if (!features?.length) return null;
  return (
    <section className="rt-cd__fcard" aria-labelledby="rt-cd-features-h">
      <h2 id="rt-cd-features-h">Course features</h2>
      <ul className="rt-fx">
        {features.slice(0, 8).map((f) => (
          <li key={f}>
            <Icon name={ICONS[iconFor(f)]} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
