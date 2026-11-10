"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { headerNav as N } from "@/data/headerNav";
import { useNav } from "@/lib/navContext";
import { subjectName } from "@/lib/nav";
import { CATALOGUE_HREF } from "@/lib/routes";
import { topBar } from "@/data/home";
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

// Explore courses, in three columns like the other menus: the subjects (one line each with its number of courses; more than
// `max`: the ones with the most courses, then "All N subjects"; A to Z), the ways of study, and the featured courses. The
// footer has our phone number for anyone unsure which course, and "Browse all courses". All of it is the live catalogue's
// (useNav, lib/nav.js), so a new subject shows once it has a course.
function CoursesPanel() {
  const C = N.courses;
  const nav = useNav();
  const total = nav.subjects.length;
  const shown = total > C.subjects.max ? [...nav.subjects].sort((a, b) => b.count - a.count).slice(0, C.subjects.max - 1) : nav.subjects;
  const subjects = [...shown].sort((a, b) => a.label.localeCompare(b.label));
  const methods = nav.methods.map((m) => ({ label: m.name, href: m.href, meta: C.methods.meta[m.slug] }));
  const featured = nav.courses.slice(0, C.featured.count).map((c) => ({ label: c.title, href: c.href, meta: subjectName(nav, c.subject) }));
  return (
    <>
      <div className="rt-nav-cols">
        <div className="rt-nav-col">
          <Group title={C.subjects.title} icon={C.subjects.icon}>
            <ul className="rt-nav-list">
              {subjects.map((x) => (
                <li key={x.slug}>
                  <Link href={x.href} className="rt-nav-link -count" aria-label={`${x.label}, ${C.subjects.count(x.count)}`}>
                    <span className="rt-nav-link__name">{x.label}</span>
                    <span className="rt-nav-link__count" aria-hidden="true">{x.count}</span>
                    {ARROW}
                  </Link>
                </li>
              ))}
              {total > C.subjects.max && <Row href={CATALOGUE_HREF} label={C.subjects.all(total)} />}
            </ul>
          </Group>
        </div>
        <div className="rt-nav-col">{methods.length > 0 && <Group title={C.methods.title} icon={C.methods.icon}><List items={methods} /></Group>}</div>
        <div className="rt-nav-col">{featured.length > 0 && <Group title={C.featured.title} icon={C.featured.icon}><List items={featured} /></Group>}</div>
      </div>
      <div className="rt-nav-foot -split">
        <p className="rt-nav-help">
          {C.help} <a href={topBar.phoneHref} className="rt-nav-tel">{topBar.phone}</a>
        </p>
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
const WIDTH = 32 * 2 + 224 * 3 + 24 * 2; // three 224px columns, 24px apart, 32px padding

// Where a menu's card sits (as Pluralsight's): its left edge under the start of the menu's name. On a smaller screen, a card
// that would run past the window's right margin starts where the menu row starts instead (under Explore courses), so it is
// never pinned to the right edge and never jumps to the far left; its name is still over the card.
function cardPlace(id, trigger, page) {
  const startOf = (btn) => btn.getBoundingClientRect().left + (parseFloat(getComputedStyle(btn).paddingLeft) || 0);
  const btn = trigger(id);
  const first = trigger(N.sections[0].id);
  if (!btn || !first) return null;
  const width = Math.min(WIDTH, page - GUTTER * 2);
  const room = page - GUTTER - width; // the furthest right a card can start
  const start = startOf(btn);
  const left = start <= room ? start : Math.max(GUTTER, Math.min(startOf(first), room));
  return { left: Math.round(left), width };
}

// The open card's place, measured again when the window changes size. `trigger(id)` is a menu's name element.
function useCardPlace(section, trigger) {
  const [place, setPlace] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      const p = cardPlace(section.id, trigger, document.documentElement.clientWidth);
      if (p) setPlace(p);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);
  return place;
}

// The open menu: one card attached to the header's bottom edge.
export default function NavCard({ section, trigger }) {
  const Panel = PANELS[section.id];
  const place = useCardPlace(section, trigger);
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
