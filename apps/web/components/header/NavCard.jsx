"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { headerNav as N } from "@/data/headerNav";
import { api } from "@/lib/trpc/react";
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

// Explore courses: every subject on the left; the panel on the right shows the popular courses, or the courses of the subject
// you click (click it again to go back). It changes only on a click, so moving the pointer across subjects never swaps it. A
// subject's number of courses and its three most popular are the real catalogue's (API catalogue.menu, asked once a while).
function CoursesPanel() {
  const C = N.courses;
  const [subjectId, setSubjectId] = useState(null);
  const sub = C.subjects.find((s) => s.id === subjectId);
  const menu = api.catalogue.menu.useQuery(undefined, { staleTime: 5 * 60 * 1000, retry: 1 });
  const live = sub && menu.data ? menu.data[sub.id] || { count: 0, top: [] } : null;
  const top = live ? live.top.map((c) => ({ label: c.title, href: coursePath(c.slug), meta: [...new Set([c.duration, ...c.methods.map(methodName)])].filter(Boolean).join(" · ") })) : [];
  const rows = Math.ceil(C.subjects.length / 3);
  return (
    <div className="rt-nav-courses">
      <div className="rt-nav-courses__head">
        <h2 className="rt-nav-h">{C.title}</h2>
        <div className="rt-nav-courses__methods">
          {C.methods.map((m) => <Link key={m.href} href={m.href} className="rt-nav-chip">{m.label}</Link>)}
          <More {...C.all} />
        </div>
      </div>
      <div className="rt-nav-courses__body">
        {/* three columns, read A to Z down each one */}
        <ul className="rt-nav-subjects" style={{ gridTemplateRows: `repeat(${rows}, auto)` }}>
          {C.subjects.map((s) => {
            const on = s.id === subjectId;
            return (
              <li key={s.id}>
                <button type="button" title={s.label} className={`rt-nav-subject${on ? " is-on" : ""}`} aria-pressed={on} aria-controls="rt-nav-preview" onClick={() => setSubjectId(on ? null : s.id)}>
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
            <div key={sub.id} className="rt-nav-fade">
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
                {sub.all}
                <NavIcon name="arrowRight" size={14} strokeWidth={2.4} />
              </Link>
            </div>
          ) : (
            <div key="popular" className="rt-nav-fade">
              <p className="rt-nav-preview__title">{C.popular.title}</p>
              <p className="rt-nav-preview__hint">{C.popular.hint}</p>
              <ul className="rt-nav-list -preview">{C.popular.items.map((c) => <Row key={c.href} {...c} />)}</ul>
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
    <div className="rt-nav-pad">
      <div className="rt-nav-cols -four">
        {L.groups.map((g) => (
          <div key={g.title}>
            <h2 className="rt-nav-h">{g.title}</h2>
            <ul className="rt-nav-list">{g.items.map((i) => <Row key={i.href} href={i.href} label={i.label} meta={i.need} />)}</ul>
          </div>
        ))}
      </div>
      <div className="rt-nav-foot"><More {...L.all} /></div>
    </div>
  );
}

// Near you: a town or postcode search (or the person's location), the main cities, and the courses that need no venue
function NearPanel() {
  const P = N.near;
  const near = useNearYou();
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
    <div className="rt-nav-pad rt-nav-near">
      <form className="rt-nav-near__form" onSubmit={submit} noValidate>
        <h2 className="rt-nav-h">{P.title}</h2>
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
          <FieldSelect id="rt-nav-course" label={P.course.label} compact value={course} onChange={setCourse} placeholder={P.course.any} options={[{ value: "", label: P.course.any }, ...P.courses]} />
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
      <div>
        <h2 className="rt-nav-h">{P.citiesTitle}</h2>
        <ul className="rt-nav-cities">
          {P.cities.map((c) => (
            <li key={c.name}>
              <Link href={c.href} className="rt-nav-city">
                <NavIcon name="pin" size={14} strokeWidth={2} />
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="rt-nav-near__side">
        <h2 className="rt-nav-h">{P.online.title}</h2>
        <ul className="rt-nav-list">{P.online.items.map((i) => <Row key={i.href} {...i} />)}</ul>
        <More {...P.all} />
      </div>
    </div>
  );
}

// Help & guides: three groups of links
function HelpPanel() {
  return (
    <div className="rt-nav-pad rt-nav-cols -three">
      {N.help.groups.map((g) => (
        <div key={g.title}>
          <h2 className="rt-nav-h">{g.title}</h2>
          <ul className="rt-nav-list">{g.items.map((i) => <Row key={i.href} {...i} />)}</ul>
        </div>
      ))}
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
      setPlace({ left: Math.round(left), width, caret: Math.round(centre - left) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);
  return place;
}

// The open menu: one card under the header that slides and resizes to sit under the menu you point at, with a small pointer
// aimed at its label.
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
      {place && <span className="rt-nav-card__caret" aria-hidden="true" style={{ left: place.caret - 7 }}></span>}
      <div key={section.id} className="rt-nav-fade">
        <Panel />
      </div>
    </section>
  );
}
