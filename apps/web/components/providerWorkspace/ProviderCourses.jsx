"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { useProvider } from "@/lib/providerWorkspace";
import { COURSE_TONE, Empty, Loading, Search, ToolSelect, getQuery, setQuery } from "./providerParts";

const FILTERS = ["q", "format", "enrolment", "category", "model", "status"];
const formatOf = (key) => pw.formats.find((f) => f.key === key) || pw.formats[0];

// Every course the provider runs, with Hurak's filters (search, mode of study, enrolment type, and under Filters the category and
// performance model; status as tabs with counts), all kept in the address. Our layout: the profile sits in the page head
// (CoursesProfile below), then one card holding the status tabs, the filters and the courses as a compact table (one
// course per row: image or "Upload course image", mode, category, status, enrolment, performance model, learners, upcoming cohorts,
// rating, Edit / manage course), then Hurak's offer of a free sales and marketing consultation.
export default function ProviderCourses() {
  const data = useProvider();
  const [f, setF] = useState({ q: "", format: "", enrolment: "", category: "", model: "", status: "" });
  const [more, setMore] = useState(false);

  useEffect(() => {
    const next = Object.fromEntries(FILTERS.map((k) => [k, getQuery(k) || ""]));
    if (!pw.formats.some((x) => x.key === next.format)) next.format = "";
    if (!pw.enrolment[next.enrolment]) next.enrolment = "";
    if (!pw.categories.some((x) => x.value === next.category)) next.category = "";
    if (!pw.models[next.model]) next.model = "";
    if (!pw.courseStatuses[next.status]) next.status = "";
    setF(next);
    if (next.category || next.model) setMore(true);
  }, []);

  if (!data) return <Loading rows={4} />;
  if (!data.courses.length) return <Empty title="No courses yet" text="Create your first course: describe it, set the price and send it to us for approval." action={{ label: "New course", href: "/provider/courses/new" }} />;

  const needle = f.q.trim().toLowerCase();
  const list = data.courses.filter((c) => (!needle || (c.title || "untitled course").toLowerCase().includes(needle))
    && (!f.format || c.format === f.format) && (!f.enrolment || c.enrolment === f.enrolment) && (!f.category || c.category === f.category)
    && (!f.model || c.model === f.model) && (!f.status || c.status === f.status));
  const filtered = Object.values(f).some((v) => v.trim());
  const set = (k) => (v) => {
    setF((x) => ({ ...x, [k]: v }));
    setQuery(k, k === "q" ? v.trim() : v);
  };
  const reset = () => {
    setF(Object.fromEntries(FILTERS.map((k) => [k, ""])));
    FILTERS.forEach((k) => setQuery(k, ""));
  };

  const statusTabs = [{ key: "", label: "All" }, ...Object.entries(pw.courseStatuses).map(([key, label]) => ({ key, label }))]
    .map((t) => ({ ...t, count: data.courses.filter((c) => (!t.key || c.status === t.key)).length }));
  const learnersOf = (id) => new Set(data.enrolments.filter((e) => e.courseId === id && e.status !== "cancelled").map((e) => e.learnerId)).size;
  const upcomingOf = (id) => data.cohorts.filter((k) => k.courseId === id && k.status === "upcoming" && !k.cancelled).length;
  const catOf = (c) => [pw.categories.find((x) => x.value === c.category)?.label, c.subcategory].filter(Boolean).join(" › ");

  return (
    <div className="rt-acc__stack">
      <section className="rt-cx" aria-label="Your courses">
        <div className="rt-cx__top">
          <div className="rt-cx-tabs" role="group" aria-label="Course status">
            {statusTabs.map((t) => (
              <button key={t.key || "all"} type="button" className={`rt-cx-tabs__tab${f.status === t.key ? " is-on" : ""}`} aria-pressed={f.status === t.key} onClick={() => set("status")(t.key)}>
                {t.label}<span>{t.count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rt-cx__bar" role="search" aria-label="Find courses">
          <Search value={f.q} onChange={set("q")} label="Search your courses" />
          <ToolSelect id="rt-pws-cf-format" label="Mode of study" value={f.format} onChange={set("format")} options={[{ value: "", label: "All modes of study" }, ...pw.formats.map((x) => ({ value: x.key, label: x.short }))]} />
          <ToolSelect id="rt-pws-cf-enr" label="Enrollment type" value={f.enrolment} onChange={set("enrolment")} options={[{ value: "", label: "All enrollment types" }, ...Object.entries(pw.enrolment).map(([value, label]) => ({ value, label }))]} />
          <button type="button" className={`rt-cx__more${more ? " is-on" : ""}`} aria-expanded={more} aria-controls="rt-pws-cf-more" onClick={() => setMore(!more)}><i className="icon-setting text-14" aria-hidden="true"></i>Filters{(f.category || f.model) && <span className="rt-cx__dot" aria-label="filters on"></span>}</button>
          {filtered && <button type="button" className="rt-cd__link" onClick={reset}>Clear filters</button>}
        </div>
        {more && (
          <div className="rt-cx__bar -more" id="rt-pws-cf-more">
            <ToolSelect id="rt-pws-cf-cat" label="Category" value={f.category} onChange={set("category")} options={[{ value: "", label: "All categories" }, ...pw.categories]} />
            <ToolSelect id="rt-pws-cf-model" label="Performance model" value={f.model} onChange={set("model")} options={[{ value: "", label: "All performance models" }, ...Object.entries(pw.models).map(([value, m]) => ({ value, label: m.label }))]} />
          </div>
        )}
        <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "course" : "courses"}`}</p>

        {list.length ? (
          <table className="rt-cx-table">
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">Course status</th>
                <th scope="col">Enrolment</th>
                <th scope="col">Performance model</th>
                <th scope="col" className="-num">Learners</th>
                <th scope="col" className="-num">Upcoming</th>
                <th scope="col" className="-num">Rating</th>
                <th scope="col"><span className="rt-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const img = c.media.find((m) => m.type === "image");
                const fm = formatOf(c.format);
                const href = `/provider/courses/${c.id}`;
                return (
                  <tr key={c.id}>
                    <td data-label="Course">
                      <span className="rt-cx-course">
                        {img ? <img src={img.src} alt="" className="rt-cx-course__img" /> : <Link href={href} className="rt-cx-course__img -none" title="Upload course image"><i className="icon-cloud text-16" aria-hidden="true"></i><span className="rt-sr">Upload course image for {c.title || "untitled course"}</span></Link>}
                        <span className="rt-cx-course__text">
                          <Link href={href} className="rt-cx-course__title" title={c.title || "Untitled course"}>{c.title || "Untitled course"}</Link>
                          <small title={[fm.short, catOf(c)].filter(Boolean).join(" · ")}>{[fm.short, catOf(c)].filter(Boolean).join(" · ")}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Course status"><span className={`rt-cx-status -${COURSE_TONE[c.status]}`}>{pw.courseStatuses[c.status]}</span></td>
                    <td data-label="Enrolment">{pw.enrolment[c.enrolment]}</td>
                    <td data-label="Performance model">{pw.models[c.model]?.label}</td>
                    <td data-label="Learners" className="-num">{learnersOf(c.id)}</td>
                    <td data-label="Upcoming" className="-num">{c.format === "on-demand" ? "—" : upcomingOf(c.id)}</td>
                    <td data-label="Rating" className="-num">{c.rating ? <span className="rt-cx-rating"><i className="icon-star text-10" aria-hidden="true"></i>{c.rating.toFixed(1)}</span> : "—"}</td>
                    <td data-label="Actions" className="-act"><Link href={href} className="rt-cx-manage" title="Edit / manage course"><span className="rt-cx-manage__text">Edit / manage course</span><span className="rt-sr">: {c.title || "untitled course"}</span><i className="icon-chevron-right text-12" aria-hidden="true"></i></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="rt-cx__empty">
            <p><b>No courses match.</b> Try another search or clear the filters.</p>
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={reset}>Clear filters</button>
          </div>
        )}
      </section>

      <section className="rt-cl-promo" aria-labelledby="rt-pws-cm-h">
        <span className="rt-cl-promo__icon" aria-hidden="true"><i className="icon-bar-chart-2 text-20"></i></span>
        <div>
          <h2 className="rt-cl-promo__title" id="rt-pws-cm-h">Let us help you increase sales</h2>
          <p className="rt-acc__note">Book a free consultation with our sales and marketing team.</p>
        </div>
        <Link href="/contact-us" className="button -sm -purple-1 text-white">Schedule meeting</Link>
      </section>
    </div>
  );
}

// The provider's profile in the page head, beside "New course" (Hurak's profile card: view, edit, copy the profile address, total
// courses and users), so the list starts straight under the title.
export function CoursesProfile() {
  const data = useProvider();
  const [toast, setToast] = useState(null);
  const clearToast = useCallback(() => setToast(null), []);
  if (!data) return <span className="rt-cx-org -loading" aria-hidden="true"></span>;
  const users = new Set(data.enrolments.map((e) => e.learnerId)).size;
  const profileUrl = `https://readtraining.co.uk/providers/${data.org.slug}`;
  const copyProfile = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setToast({ message: "Profile URL copied" });
    } catch {
      setToast({ message: profileUrl });
    }
  };
  const initials = data.org.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <section className="rt-cx-org" aria-labelledby="rt-pws-cp-h">
      <span className="rt-cx-org__logo" aria-hidden="true">{initials}</span>
      <div className="rt-cx-org__who">
        <h2 className="rt-cx-org__name" id="rt-pws-cp-h">{data.org.name}</h2>
        <p className="rt-cx-org__links">
          <Link href="/provider/profile">View</Link>
          <Link href="/provider/settings">Edit</Link>
          <button type="button" onClick={copyProfile}>Copy Profile URL</button>
        </p>
      </div>
      <dl className="rt-cx-org__stats">
        <div><dt>Total courses</dt><dd>{data.courses.length}</dd></div>
        <div><dt>Total users</dt><dd>{users}</dd></div>
      </dl>
      <Toast toast={toast} onDone={clearToast} />
    </section>
  );
}
