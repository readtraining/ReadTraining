"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { headerNav as N } from "@/data/headerNav";
import { useNav } from "@/lib/navContext";
import { subjectName } from "@/lib/nav";
import { CATALOGUE_HREF, coursePath } from "@/lib/routes";
import { methodName } from "@/lib/taxonomy";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { NavIcon } from "./navIcons";
import { useNearYou } from "./useNearYou";

// The open menu's card. Every menu has the same parts: groups with an icon, a heading and a thin line, then links with a short
// line (or two) under the name; pointing at a link tints it and slides an arrow in at its end; one footer link across the card.

const ARROW = (
  <svg className="rt-nav-arrow" width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M1.5 6h12.5" />
    <path d="M9.5 1.5 14 6l-4.5 4.5" />
  </svg>
);

// a link: its name, up to two short lines under it, and the arrow
function Row({ href, label, meta }) {
  const lines = (Array.isArray(meta) ? meta : [meta]).filter(Boolean);
  return (
    <li>
      <Link href={href} className="rt-nav-link">
        <span className="rt-nav-link__name">{label}</span>
        {lines.map((l) => <span key={l} className="rt-nav-link__meta">{l}</span>)}
        {ARROW}
      </Link>
    </li>
  );
}

// a group: its icon and heading, the line, then its links (or other content)
function Group({ title, icon, children }) {
  return (
    <div className="rt-nav-group">
      <div className="rt-nav-g">
        <NavIcon name={icon} size={18} strokeWidth={2} />
        <h2 className="rt-nav-h">{title}</h2>
      </div>
      <div className="rt-nav-rule" />
      {children}
    </div>
  );
}

function List({ items }) {
  return <ul className="rt-nav-list">{items.map((i) => <Row key={i.href} {...i} />)}</ul>;
}

function Foot({ label, href }) {
  return (
    <div className="rt-nav-foot">
      <Link href={href} className="rt-nav-more">{label} →</Link>
    </div>
  );
}

// Explore courses, in two halves. Left: the subjects, one line each: up to 5 in one column, 6 to 10 in two columns of 5, more than
// 10: the 9 with the most courses, then "All N subjects"; A to Z down each column. A click chooses a subject: the right half
// then shows its name and number of courses, its top courses and a button to all of them (a second click goes back). Right,
// otherwise: the featured courses. The footer has the ways of study and "Browse all courses". All of it is the live
// catalogue's (useNav, lib/nav.js), so a new subject shows once it has a course.
function CoursesPanel() {
  const C = N.courses;
  const nav = useNav();
  const [chosen, setChosen] = useState(null);
  const total = nav.subjects.length;
  const shown = total > 10 ? [...nav.subjects].sort((a, b) => b.count - a.count).slice(0, 9) : nav.subjects;
  const subjects = [...shown].sort((a, b) => a.label.localeCompare(b.label));
  const sub = nav.subjects.find((x) => x.slug === chosen);
  const featured = nav.courses.slice(0, C.featured.count).map((c) => ({ label: c.title, href: c.href, meta: subjectName(nav, c.subject) }));
  const top = sub ? sub.top.map((c) => ({ label: c.title, href: coursePath(c.slug), meta: [...new Set([c.duration, ...c.methods.map(methodName)])].filter(Boolean).join(" · ") })) : [];
  const subject = (x) => {
    const on = x.slug === chosen;
    return (
      <li key={x.slug}>
        <button type="button" className={`rt-nav-link rt-nav-subject${on ? " is-on" : ""}`} aria-pressed={on} aria-controls="rt-nav-chosen" onClick={() => setChosen(on ? null : x.slug)}>
          <span className="rt-nav-link__name">{x.label}</span>
          {ARROW}
        </button>
      </li>
    );
  };
  const more = total > 10 && (
    <li>
      <Link href={CATALOGUE_HREF} className="rt-nav-link -all">
        <span className="rt-nav-link__name">{C.subjects.all(total)} →</span>
      </Link>
    </li>
  );
  return (
    <>
      <div className="rt-nav-cols">
        <div className={`rt-nav-half${total > 5 ? " -two" : ""}`}>
          <Group title={C.subjects.title} icon={C.subjects.icon}>
            <div className="rt-nav-twin">
              <ul className="rt-nav-list">{subjects.slice(0, 5).map(subject)}</ul>
              {total > 5 && (
                <ul className="rt-nav-list">
                  {subjects.slice(5).map(subject)}
                  {more}
                </ul>
              )}
            </div>
          </Group>
        </div>
        <div className="rt-nav-half -rest" id="rt-nav-chosen" aria-live="polite">
          {sub ? (
            <div key={sub.slug} className="rt-nav-fade">
              <Group title={`${sub.label} · ${C.chosen.count(sub.count)}`} icon={C.chosen.icon}><List items={top} /></Group>
              <Link href={sub.href} className="button -sm -purple-1 text-white rt-nav-cta">{C.chosen.all(sub.label)} →</Link>
            </div>
          ) : (
            featured.length > 0 && <Group title={C.featured.title} icon={C.featured.icon}><List items={featured} /></Group>
          )}
        </div>
      </div>
      <div className="rt-nav-foot -split">
        <div className="rt-nav-chips">
          {nav.methods.map((m) => <Link key={m.href} href={m.href} className="rt-nav-chip">{m.name}</Link>)}
        </div>
        <Link href={C.all.href} className="rt-nav-more">{C.all.label} →</Link>
      </div>
    </>
  );
}

// Licences: Security, then Alcohol licensing, then Construction with Other under it
function LicencesPanel() {
  const L = N.licences;
  const [first, second, ...rest] = L.groups;
  const group = (g) => <Group key={g.title} title={g.title} icon={g.icon}><List items={g.items.map((i) => ({ label: i.label, href: i.href, meta: i.need }))} /></Group>;
  return (
    <>
      <div className="rt-nav-cols">
        <div className="rt-nav-col">{group(first)}</div>
        <div className="rt-nav-col">{group(second)}</div>
        <div className="rt-nav-col -stack">{rest.map(group)}</div>
      </div>
      <Foot {...L.all} />
    </>
  );
}

// Location: a town or postcode search (or the person's location), the towns with live dates, and the courses that need no venue
function NearPanel() {
  const P = N.near;
  const nav = useNav();
  const near = useNearYou();
  // the courses you can look for in a town: the live ones that run somewhere
  const courses = nav.courses.filter((c) => c.towns.length).map((c) => ({ value: c.slug, label: c.title }));
  const towns = nav.towns.slice(0, P.cities).map((t) => ({ label: t.name, href: t.href }));
  const online = P.online.items.filter((i) => nav.methods.some((m) => i.href.endsWith(m.slug)));
  const [town, setTown] = useState("");
  const [course, setCourse] = useState("");
  const [error, setError] = useState(false);
  const townRef = useRef(null);
  const submit = (e) => {
    e.preventDefault();
    if (near.go(town, course)) return;
    setError(true);
    townRef.current?.focus();
  };
  return (
    <>
      <div className="rt-nav-cols">
        <div className="rt-nav-col">
          <Group title={P.find.title} icon={P.find.icon}>
            <form className="rt-nav-near__form" onSubmit={submit} noValidate>
              <div className="rt-nav-field">
                <label htmlFor="rt-nav-town">{P.town.label}</label>
                <input
                  ref={townRef}
                  id="rt-nav-town"
                  name="town"
                  type="text"
                  value={town}
                  autoComplete="postal-code"
                  placeholder={P.town.placeholder}
                  aria-invalid={error || undefined}
                  aria-describedby={error ? "rt-nav-town-error" : undefined}
                  onChange={(e) => {
                    setTown(e.target.value);
                    if (error) setError(false);
                  }}
                />
                {error && <span className="rt-nav-field__error" id="rt-nav-town-error">Enter a town or postcode</span>}
              </div>
              <div className="rt-nav-field">
                <label htmlFor="rt-nav-course">{P.course.label}</label>
                <FieldSelect id="rt-nav-course" label={P.course.label} compact value={course} onChange={setCourse} placeholder={P.course.any} options={[{ value: "", label: P.course.any }, ...courses]} />
              </div>
              <div className="rt-nav-near__actions">
                <button type="submit" className="button -sm -purple-1 text-white">{P.submit}</button>
                <button type="button" className="rt-nav-btn" onClick={() => near.locate(course)} disabled={near.locating}>
                  <NavIcon name="locate" size={15} strokeWidth={2} />
                  {near.locating ? P.locating : P.locate}
                </button>
              </div>
              {near.failed && <p className="rt-nav-near__note" role="status">{P.locateFailed}</p>}
            </form>
          </Group>
        </div>
        {towns.length > 0 && (
          <div className="rt-nav-col">
            <Group title={P.citiesTitle} icon={P.citiesIcon}><List items={towns} /></Group>
          </div>
        )}
        {online.length > 0 && (
          <div className="rt-nav-col">
            <Group title={P.online.title} icon={P.online.icon}><List items={online} /></Group>
          </div>
        )}
      </div>
      <Foot {...P.all} />
    </>
  );
}

// Help & guides: three groups of links
function HelpPanel() {
  return (
    <>
      <div className="rt-nav-cols">
        {N.help.groups.map((g) => (
          <div key={g.title} className="rt-nav-col">
            <Group title={g.title} icon={g.icon}><List items={g.items} /></Group>
          </div>
        ))}
      </div>
      <Foot {...N.help.all} />
    </>
  );
}

const PANELS = { courses: CoursesPanel, licences: LicencesPanel, near: NearPanel, help: HelpPanel };

const GUTTER = 32; // the card never comes closer than this to the window's edges
const APART = 16; // two menus' cards never start closer than this when another place fits
const WIDTH = 32 * 2 + 224 * 3 + 24 * 2; // three 224px columns, 24px apart, 32px padding
const WIDE = 32 * 2 + 224 * 2 + 24 + 24 + 348; // Explore courses with its subjects in two columns, beside the courses

// Where each menu's card sits (as Pluralsight's): its left edge under the start of the menu's name; a card too wide for the
// window moves left only as far as it must. If that would put it where an earlier menu's card starts, it lines its right edge
// up with the end of its own name instead (at most to the page's left margin, with its name still over the card), so no two
// menus open in the same place. All four are worked out in order, so a menu's place is the same whichever one is open.
function cardPlaces(trigger, page, widths) {
  const taken = [];
  const places = {};
  for (const s of N.sections) {
    const btn = trigger(s.id);
    if (!btn) continue;
    const width = Math.min(widths[s.id] ?? WIDTH, page - GUTTER * 2);
    const room = page - GUTTER - width; // the furthest right this card can start
    const r = btn.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(btn).paddingLeft) || 0;
    const start = r.left + pad;
    const end = r.right - pad;
    const underEnd = Math.max(GUTTER, end - width);
    const choices = start <= room ? [start] : [room, ...(end <= underEnd + width ? [underEnd] : [])];
    const left = choices.find((x) => !taken.some((t) => Math.abs(t - x) < APART)) ?? choices[0];
    taken.push(left);
    places[s.id] = { left: Math.round(left), width };
  }
  return places;
}

// The open card's place, measured again when the window changes size. `trigger(id)` is a menu's name element.
function useCardPlace(section, trigger, widths) {
  const [place, setPlace] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      const p = cardPlaces(trigger, document.documentElement.clientWidth, widths)[section.id];
      if (p) setPlace(p);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id, widths.courses]);
  return place;
}

// The open menu: one card attached to the header's bottom edge.
export default function NavCard({ section, trigger }) {
  const Panel = PANELS[section.id];
  const nav = useNav();
  const widths = { courses: nav.subjects.length > 5 ? WIDE : WIDTH };
  const place = useCardPlace(section, trigger, widths);
  return (
    <section
      id="rt-nav-card"
      className="rt-nav-card"
      aria-label={section.label}
      data-rt-nav
      style={place ? { left: place.left, width: place.width } : { visibility: "hidden" }}
    >
      <div key={section.id} className="rt-nav-fade">
        <Panel />
      </div>
    </section>
  );
}
