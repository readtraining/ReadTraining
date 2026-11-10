"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { headerNav as N } from "@/data/headerNav";
import { useNav } from "@/lib/navContext";
import { subjectName } from "@/lib/nav";
import { coursePath } from "@/lib/routes";
import { methodName } from "@/lib/taxonomy";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { NavIcon } from "./navIcons";
import { useNearYou } from "./useNearYou";

// a link with a name and a grey line under it
function Row({ href, label, meta, icon }) {
  return (
    <li>
      <Link href={href} title={label} className={`rt-nav-link${icon ? " -icon" : ""}`}>
        {icon && <span className="rt-nav-tile"><NavIcon name={icon} size={16} /></span>}
        <span className="rt-nav-link__text">
          <span className="rt-nav-link__name">{label}</span>
          {meta && <span className="rt-nav-link__meta">{meta}</span>}
        </span>
      </Link>
    </li>
  );
}

function More({ href, label }) {
  return (
    <Link href={href} className="rt-nav-more">
      {label}
      <NavIcon name="arrowRight" size={13} strokeWidth={2.4} />
    </Link>
  );
}

// The band across the top of every menu: its title, and its main link (or the study methods and the link, in Explore courses)
function Band({ title, children }) {
  return (
    <div className="rt-nav-band">
      <h2 className="rt-nav-band__title">{title}</h2>
      <div className="rt-nav-band__side">{children}</div>
    </div>
  );
}

// Explore courses: every subject with live courses on the left; the panel on the right shows the popular courses, or the courses
// of the subject you click (click it again to go back). It changes only on a click, so moving the pointer across subjects never
// swaps it. The subjects, their number of courses and top three, the methods and the popular courses are the live catalogue's
// (useNav, lib/nav.js), so a new subject shows up here once it has a course and a retired one goes.
function CoursesPanel() {
  const C = N.courses;
  const nav = useNav();
  const [subjectId, setSubjectId] = useState(null);
  const sub = nav.subjects.find((s) => s.slug === subjectId);
  const live = sub ? { count: sub.count, top: sub.top } : null;
  const top = live ? live.top.map((c) => ({ label: c.title, href: coursePath(c.slug), meta: [...new Set([c.duration, ...c.methods.map(methodName)])].filter(Boolean).join(" · ") })) : [];
  const popular = nav.courses.slice(0, C.popular.count).map((c) => ({ label: c.title, href: c.href, meta: subjectName(nav, c.subject) }));
  // the subjects in even columns, read A to Z down each one: two columns up to 8 subjects, three from 9, and the columns' lengths
  // differ by one at most (7 is 4 + 3, 10 is 4 + 3 + 3), so no subject is ever left alone in a column
  const n = nav.subjects.length;
  const cols = Math.min(n, n > 8 ? 3 : 2) || 1;
  const place = [];
  for (let col = 0, row = 0, i = 0; i < n; i++) {
    place.push({ gridColumn: col + 1, gridRow: row + 1 });
    row += 1;
    if (row === Math.floor(n / cols) + (col < n % cols ? 1 : 0)) { col += 1; row = 0; }
  }
  return (
    <div>
      <Band title={C.title}>
        {nav.methods.map((m) => <Link key={m.href} href={m.href} className="rt-nav-chip">{m.name}</Link>)}
        <More {...C.all} />
      </Band>
      <div className="rt-nav-pad rt-nav-courses">
        <ul className="rt-nav-subjects" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {nav.subjects.map((s, i) => {
            const on = s.slug === subjectId;
            return (
              <li key={s.slug} style={place[i]}>
                <button type="button" title={s.label} className={`rt-nav-subject${on ? " is-on" : ""}`} aria-pressed={on} aria-controls="rt-nav-preview" onClick={() => setSubjectId(on ? null : s.slug)}>
                  <span className="rt-nav-tile"><NavIcon name={s.icon} size={16} /></span>
                  <span className="rt-nav-subject__name">{s.label}</span>
                  <NavIcon name="chevronRight" size={14} strokeWidth={2.2} className="rt-nav-subject__chev" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="rt-nav-preview" id="rt-nav-preview" aria-live="polite">
          {sub ? (
            <div key={sub.slug} className="rt-nav-fade">
              <div className="rt-nav-preview__head">
                <span className="rt-nav-tile -solid"><NavIcon name={sub.icon} size={18} /></span>
                <span className="rt-nav-link__text">
                  <span className="rt-nav-preview__title">{sub.label}</span>
                  <span className="rt-nav-link__meta">{live ? `${live.count} ${live.count === 1 ? "course" : "courses"}` : "\u00a0"}</span>
                </span>
              </div>
              {top.length > 0 && <p className="rt-nav-eyebrow">{C.topTitle}</p>}
              {top.length > 0 && <ul className="rt-nav-list -preview">{top.map((c) => <Row key={c.href} {...c} />)}</ul>}
              {live && !top.length && <p className="rt-nav-preview__hint">No courses here yet.</p>}
              <Link href={sub.href} className="button -sm -purple-1 text-white rt-nav-cta">
                {C.allOf(sub.label)}
                <NavIcon name="arrowRight" size={14} strokeWidth={2.4} />
              </Link>
            </div>
          ) : (
            <div key="popular" className="rt-nav-fade">
              <p className="rt-nav-preview__title">{C.popular.title}</p>
              <p className="rt-nav-preview__hint">{C.popular.hint}</p>
              <ul className="rt-nav-list -preview">{popular.map((c) => <Row key={c.href} {...c} />)}</ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Licences: every licence and card with what it needs, in four groups
function LicencesPanel() {
  const L = N.licences;
  return (
    <div>
      <Band title={L.title}>
        <More {...L.all} />
      </Band>
      <div className="rt-nav-pad rt-nav-cols -four">
        {L.groups.map((g) => (
          <div key={g.title}>
            <h2 className="rt-nav-h">{g.title}</h2>
            <ul className="rt-nav-list">{g.items.map((i) => <Row key={i.href} href={i.href} label={i.label} meta={i.need} />)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// Location: a town or postcode search (or the person's location), the towns with live dates, and the courses that need no venue
function NearPanel() {
  const P = N.near;
  const nav = useNav();
  const near = useNearYou();
  // the courses you can look for in a town: the live ones that run somewhere
  const courses = nav.courses.filter((c) => c.towns.length).map((c) => ({ value: c.slug, label: c.title }));
  const towns = nav.towns.slice(0, P.cities);
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
    <div>
      <Band title={P.title}>
        <More {...P.all} />
      </Band>
      <div className="rt-nav-pad rt-nav-near">
        <form className="rt-nav-near__form" onSubmit={submit} noValidate>
          <div className="rt-nav-field">
            <label htmlFor="rt-nav-town">{P.town.label}</label>
            <input
              ref={townRef}
              id="rt-nav-town"
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
            <button type="submit" className="button -md -purple-1 text-white">{P.submit}</button>
            <button type="button" className="rt-nav-btn" onClick={() => near.locate(course)} disabled={near.locating}>
              <NavIcon name="locate" size={15} strokeWidth={2} />
              {near.locating ? P.locating : P.locate}
            </button>
          </div>
          {near.failed && <p className="rt-nav-near__note" role="status">{P.locateFailed}</p>}
        </form>
        {towns.length > 0 && (
        <div>
          <h2 className="rt-nav-h">{P.citiesTitle}</h2>
          <ul className="rt-nav-cities">
            {towns.map((c) => (
              <li key={c.name}>
                <Link href={c.href} className="rt-nav-city">
                  <NavIcon name="pin" size={14} strokeWidth={2} />
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        )}
        {online.length > 0 && (
        <div className="rt-nav-near__side">
          <h2 className="rt-nav-h">{P.online.title}</h2>
          <ul className="rt-nav-list">{online.map((i) => <Row key={i.href} {...i} />)}</ul>
        </div>
        )}
      </div>
    </div>
  );
}

// Help & guides: three groups of links
function HelpPanel() {
  return (
    <div>
      <Band title={N.help.title}>
        <More {...N.help.all} />
      </Band>
      <div className="rt-nav-pad rt-nav-cols -three">
        {N.help.groups.map((g) => (
          <div key={g.title}>
            <h2 className="rt-nav-h">{g.title}</h2>
            <ul className="rt-nav-list">{g.items.map((i) => <Row key={i.href} {...i} />)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

const PANELS = { courses: CoursesPanel, licences: LicencesPanel, near: NearPanel, help: HelpPanel };

const GUTTER = 32;

// Where the open card sits: centred under its menu's label, as wide as the menu needs, kept inside the page's gutters. Measured
// again when the window changes size. `trigger(id)` is the menu's label element.
function useCardPlace(section, trigger) {
  const [place, setPlace] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      const btn = trigger(section.id);
      if (!btn) return;
      const page = document.documentElement.clientWidth;
      const width = Math.min(section.width, page - GUTTER * 2);
      const r = btn.getBoundingClientRect();
      const centre = r.left + r.width / 2;
      const left = Math.max(GUTTER, Math.min(page - GUTTER - width, centre - width / 2));
      setPlace({ left: Math.round(left), width });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);
  return place;
}

// The open menu: one card under the header that slides and resizes to sit under the menu you point at.
export default function NavCard({ section, trigger, cardProps }) {
  const Panel = PANELS[section.id];
  const place = useCardPlace(section, trigger);
  return (
    <section
      id="rt-nav-card"
      className="rt-nav-card"
      aria-label={section.label}
      data-rt-nav
      style={place ? { left: place.left, width: place.width } : { visibility: "hidden" }}
      {...cardProps}
    >
      <div key={section.id} className="rt-nav-fade">
        <Panel />
      </div>
    </section>
  );
}
