import React from "react";

// Course features, the way Hurak shows them: a heading, then one row of rounded badges, each an icon plus its text.
// The icon is picked from the wording; anything unrecognised gets a tick.
const ICONS = {
  refresh: <><path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  award: <><circle cx="12" cy="9" r="5" /><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5" /></>,
  tag: <><path d="M20 12l-8 8-9-9V3h8z" /><circle cx="7.5" cy="7.5" r="1.2" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5L16 9.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  pin: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  check: <path d="M5 12l5 5L20 7" />,
};
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[iconFor(f)]}</svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
