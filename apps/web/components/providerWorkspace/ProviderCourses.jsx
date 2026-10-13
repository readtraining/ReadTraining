"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { duplicateCourse, useProvider } from "@/lib/providerWorkspace";
import { formatPrice } from "@/lib/format";
import { COURSE_TONE, Empty, Loading, Pill, Search, Tabs, ToolSelect, getQuery, setQuery } from "./providerParts";

const STATUS_TABS = ["all", "approved", "pending", "draft", "changes"];
const formatOf = (key) => pw.formats.find((f) => f.key === key) || pw.formats[0];

// The lowest price a learner can pay: a flat price, or the cheapest tier of the course's package.
export function coursePrice(course, packs) {
  if (course.pricing.type === "tiered") {
    const p = packs[course.pricing.packageId];
    if (!p) return { from: false, price: 0 };
    return { from: true, price: Math.min(...pw.tiers.map((t) => p.tiers[t.key]?.price || 0).filter((n) => n > 0)) || 0 };
  }
  return { from: false, price: Number(course.pricing.price) || 0 };
}

// Every course the provider runs: search by title, filter by format, category, status (tabs with counts) and enrolment, all kept in
// the address. Each row shows the course's picture (or its format's icon), status, format, upcoming cohorts, learners, price and
// rating, with Edit, Duplicate and View cohorts.
export default function ProviderCourses() {
  const data = useProvider();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [format, setFormat] = useState("");
  const [category, setCategory] = useState("");
  const [enrolment, setEnrolment] = useState("");
  const [toast, setToast] = useState(null);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    setQ(getQuery("q") || "");
    const s = getQuery("status");
    if (STATUS_TABS.includes(s)) setStatus(s);
    const f = getQuery("format");
    if (pw.formats.some((x) => x.key === f)) setFormat(f);
    const c = getQuery("category");
    if (pw.categories.some((x) => x.value === c)) setCategory(c);
    const e = getQuery("enrolment");
    if (e === "public" || e === "private") setEnrolment(e);
  }, []);

  if (!data) return <Loading rows={4} />;

  const needle = q.trim().toLowerCase();
  const base = data.courses.filter((c) => (!needle || (c.title || "untitled course").toLowerCase().includes(needle)) && (!format || c.format === format) && (!category || c.category === category) && (!enrolment || c.enrolment === enrolment));
  const list = base.filter((c) => status === "all" || c.status === status);
  const tabs = STATUS_TABS.map((t) => ({ key: t, label: t === "all" ? "All" : pw.courseStatuses[t], count: base.filter((c) => t === "all" || c.status === t).length }));
  const filtered = Boolean(needle || format || category || enrolment || status !== "all");

  const upcoming = (id) => data.cohorts.filter((k) => k.courseId === id && (k.status === "upcoming" || k.status === "progress")).length;
  const learners = (id) => new Set(data.enrolments.filter((e) => e.courseId === id).map((e) => e.learnerId)).size;

  const set = (key, setter) => (v) => {
    setter(v);
    setQuery(key, v);
  };
  const reset = () => {
    [["q", setQ], ["status", setStatus], ["format", setFormat], ["category", setCategory], ["enrolment", setEnrolment]].forEach(([k, s]) => {
      s(k === "status" ? "all" : "");
      setQuery(k, "");
    });
  };
  const copy = (c) => {
    const id = duplicateCourse(c.id);
    if (id) setToast({ message: `Copy saved as a draft. Change its name before you send it for review.`, href: `/provider/courses/${id}?tab=description`, label: "Edit copy" });
  };

  if (!data.courses.length) return <Empty title="No courses yet" text="Create your first course: describe it, set the price and send it to us to check." action={{ label: "Create a course", href: "/provider/courses/new" }} />;

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={status} onChange={(t) => { setStatus(t); setQuery("status", t === "all" ? "" : t); }} label="Show courses" />
      </div>
      <div className="rt-adm-toolbar">
        <Search value={q} onChange={(v) => { setQ(v); setQuery("q", v.trim()); }} label="Search courses by title" />
        <div className="rt-adm-toolbar__end">
          <ToolSelect id="rt-pws-cf-format" label="Format" value={format} onChange={set("format", setFormat)} options={[{ value: "", label: "All formats" }, ...pw.formats.map((f) => ({ value: f.key, label: f.short }))]} />
          <ToolSelect id="rt-pws-cf-cat" label="Category" value={category} onChange={set("category", setCategory)} options={[{ value: "", label: "All categories" }, ...pw.categories]} />
          <ToolSelect id="rt-pws-cf-enr" label="Enrolment" value={enrolment} onChange={set("enrolment", setEnrolment)} options={[{ value: "", label: "Public and private" }, { value: "public", label: "Public" }, { value: "private", label: "Private" }]} />
        </div>
      </div>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "course" : "courses"}`}</p>

      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table rt-pws-course-table">
            <thead>
              <tr><th scope="col">Course</th><th scope="col">Status</th><th scope="col">Upcoming cohorts</th><th scope="col">Learners</th><th scope="col">Price</th><th scope="col">Rating</th><th scope="col"><span className="rt-sr">Actions</span></th></tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const f = formatOf(c.format);
                const img = c.media.find((m) => m.type === "image");
                const p = coursePrice(c, data.byId.pack);
                return (
                  <tr key={c.id}>
                    <td data-label="Course">
                      <div className="rt-pws-course-row">
                        {img ? <img src={img.src} alt="" className="rt-pws-course-thumb" /> : <span className="rt-pws-course-thumb -icon" aria-hidden="true"><i className={`${f.icon} text-20`}></i></span>}
                        <span>
                          <Link href={`/provider/courses/${c.id}`} className="rt-adm-strong">{c.title || "Untitled course"}</Link>
                          <small>{f.short}{c.enrolment === "private" ? " · Private" : ""}</small>
                        </span>
                      </div>
                    </td>
                    <td data-label="Status"><Pill tone={COURSE_TONE[c.status]}>{pw.courseStatuses[c.status]}</Pill></td>
                    <td data-label="Upcoming cohorts">{c.format === "on-demand" ? <span className="rt-adm-muted">Starts on booking</span> : upcoming(c.id)}</td>
                    <td data-label="Learners">{learners(c.id)}</td>
                    <td data-label="Price">{p.price ? `${p.from ? "From " : ""}${formatPrice(p.price)}` : <span className="rt-adm-muted">Not set</span>}</td>
                    <td data-label="Rating">{c.rating ? <span className="rt-pws-course-rating"><i className="icon-star text-12" aria-hidden="true"></i>{c.rating.toFixed(1)}</span> : <span className="rt-adm-muted">No reviews</span>}</td>
                    <td data-label="Actions">
                      <div className="rt-adm-rowactions">
                        <Link href={`/provider/courses/${c.id}`} className="button -sm -outline-purple-1 text-purple-1">Edit<span className="rt-sr"> {c.title || "untitled course"}</span></Link>
                        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => copy(c)}>Duplicate<span className="rt-sr"> {c.title || "untitled course"}</span></button>
                        {c.format !== "on-demand" && <Link href={`/provider/cohorts?course=${c.id}`} className="fb-textlink">Cohorts<span className="rt-sr"> for {c.title || "untitled course"}</span></Link>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No courses match" text={filtered ? "Try another search or clear the filters." : ""} action={{ label: "Clear filters", onClick: reset }} />
      )}
      <Toast toast={toast} onDone={clearToast} duration={6000} />
    </div>
  );
}
