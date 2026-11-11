"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { headerNav as N } from "@/data/headerNav";
import { useNav } from "@/lib/navContext";
import { shortCourseName, subjectName } from "@/lib/nav";
import { CATALOGUE_HREF } from "@/lib/routes";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { NavIcon } from "./navIcons";
import NavArrow from "./NavArrow";
import { useNearYou } from "./useNearYou";

// The open menu's card. Every menu has the same parts: groups with an icon, a heading and a thin line, then links with a short
// line (or two) under the name; pointing at a link tints it and slides an arrow in at its end; one footer link across the card.

// a link: its name, up to two short lines under it, and the arrow
function Row({ href, label, meta }) {
  const lines = (Array.isArray(meta) ? meta : [meta]).filter(Boolean);
  return (
    <li>
      <Link href={href} className="rt-nav-link">
        <span className="rt-nav-link__name">{label}</span>
        {lines.map((l) => <span key={l} className="rt-nav-link__meta">{l}</span>)}
        <NavArrow className="rt-nav-arrow" />
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
      <Link href={href} className="rt-nav-more">{label}<NavArrow className="rt-nav-more__arrow" /></Link>
    </div>
  );
}

// Explore courses: the subjects (up to `perColumn` in one column; more, two columns split evenly, so 8 is 4 + 4 and 14 is 7 +
// 7; more than `max`: the ones with the most courses, then "All N subjects"; A to Z down each column), the popular courses
// (by their short names) and the ways of study (in-house training for teams last). The footer is "Browse all courses", as
// in the other menus. The subjects, methods and courses are the live catalogue's (useNav, lib/nav.js), so a new subject
// shows once it has a course.
function CoursesPanel() {
  const C = N.courses;
  const nav = useNav();
  const total = nav.subjects.length;
  const shown = total > C.subjects.max ? [...nav.subjects].sort((a, b) => b.count - a.count).slice(0, C.subjects.max - 1) : nav.subjects;
  const subjects = [...shown].sort((a, b) => a.label.localeCompare(b.label)).map((x) => <Row key={x.slug} href={x.href} label={x.label} />);
  if (total > C.subjects.max) subjects.push(<Row key="all" href={CATALOGUE_HREF} label={C.subjects.all(total)} />);
  const two = subjects.length > C.subjects.perColumn;
  const half = two ? Math.ceil(subjects.length / 2) : subjects.length; // the first column's share
  const methods = [...nav.methods.map((m) => ({ label: m.name, href: m.href, meta: C.methods.meta[m.slug] })), C.methods.inhouse];
  const popular = nav.courses.slice(0, C.popular.count).map((c) => ({ label: shortCourseName(c.title), href: c.href, meta: subjectName(nav, c.subject) }));
  return (
    <>
      <div className="rt-nav-cols">
        <div className={`rt-nav-col${two ? " -two" : ""}`}>
          {subjects.length > 0 && <Group title={C.subjects.title} icon={C.subjects.icon}>
            <div className="rt-nav-twin">
              <ul className="rt-nav-list">{subjects.slice(0, half)}</ul>
              {two && <ul className="rt-nav-list">{subjects.slice(half)}</ul>}
            </div>
          </Group>}
        </div>
        <div className="rt-nav-col">{popular.length > 0 && <Group title={C.popular.title} icon={C.popular.icon}><List items={popular} /></Group>}</div>
        <div className="rt-nav-col"><Group title={C.methods.title} icon={C.methods.icon}><List items={methods} /></Group></div>
      </div>
      <Foot {...C.all} />
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
const WIDE = 32 * 2 + 224 * 4 + 24 * 3; // Explore courses with its subjects in two columns: four columns

// Where a menu's card sits (as Pluralsight's): its left edge under the start of the menu's name. On a smaller screen, a card
// that would run past the header's right edge (the end of the Sign up button, or the window's right margin) moves left only
// as far as it must, so it ends in line with the header, never against the screen edge, and slides smoothly as the window
// narrows; its name stays over it.
function cardPlace(id, trigger, page, cardWidth) {
  const btn = trigger(id);
  if (!btn) return null;
  const width = Math.min(cardWidth, page - GUTTER * 2);
  const buttons = document.querySelector(".header-right__buttons")?.getBoundingClientRect();
  const limit = buttons?.width ? buttons.right : page - GUTTER; // the card's right edge goes no further
  const start = btn.getBoundingClientRect().left + (parseFloat(getComputedStyle(btn).paddingLeft) || 0);
  return { left: Math.round(Math.max(GUTTER, Math.min(start, limit - width))), width };
}

// The open card's place, measured again when the window changes size. `trigger(id)` is a menu's name element.
function useCardPlace(section, trigger, cardWidth) {
  const [place, setPlace] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      const p = cardPlace(section.id, trigger, document.documentElement.clientWidth, cardWidth);
      if (p) setPlace(p);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id, cardWidth]);
  return place;
}

// The open menu: one card attached to the header's bottom edge.
export default function NavCard({ section, trigger }) {
  const Panel = PANELS[section.id];
  const nav = useNav();
  const place = useCardPlace(section, trigger, section.id === "courses" && nav.subjects.length > N.courses.subjects.perColumn ? WIDE : WIDTH);
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
