"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { learnerName, useProvider } from "@/lib/providerWorkspace";
import { Empty, Loading, Search, ToolSelect, getQuery, setQuery } from "./providerParts";
import { downloadCsv, formatOrderDay } from "./moneyParts";

// Everyone booked on the provider's courses: search by name or email, filter by course or company (kept in the address), and a
// CSV of what is shown. Each row: contact, how many courses they have booked, their last booking and their certificates.
export default function ProviderLearners() {
  const data = useProvider();
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("");
  const [company, setCompany] = useState("");
  useEffect(() => {
    setQ(getQuery("q") || "");
    setCourse(getQuery("course") || "");
    setCompany(getQuery("company") || "");
  }, []);
  if (!data) return <Loading rows={2} />;
  if (!data.learners.length) {
    return <Empty title="No learners yet" text="Once people book your courses, you can see their bookings, results and certificates here." action={{ href: "/provider/orders/new", label: "Add an order" }} />;
  }

  // one row per learner with their bookings
  const rows = data.learners.map((l) => {
    const mine = data.enrolments.filter((e) => e.learnerId === l.id);
    const lastAt = mine.reduce((m, e) => Math.max(m, data.orders.find((o) => o.ref === e.orderRef)?.at || 0), 0);
    return { ...l, courses: new Set(mine.map((e) => e.courseId)), booked: mine.length, lastAt, certs: mine.filter((e) => e.certificate).length };
  });
  const companies = [...new Set(data.learners.map((l) => l.company).filter(Boolean))].sort();
  const needle = q.trim().toLowerCase();
  const list = rows
    .filter((l) => (!needle || `${learnerName(l)} ${l.email}`.toLowerCase().includes(needle)) && (!course || l.courses.has(course)) && (!company || l.company === company))
    .sort((a, b) => b.lastAt - a.lastAt || learnerName(a).localeCompare(learnerName(b)));
  const csv = () => downloadCsv("learners.csv", [["First name", "Last name", "Email", "Phone", "Company", "Courses booked", "Last booking", "Certificates"], ...list.map((l) => [l.first, l.last, l.email, l.phone, l.company, l.booked, l.lastAt ? new Date(l.lastAt).toISOString().slice(0, 10) : "", l.certs])]);

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Search value={q} onChange={(v) => { setQ(v); setQuery("q", v.trim()); }} label="Search by name or email" />
        <div className="rt-adm-toolbar__end">
          <ToolSelect id="rt-pws-lrn-course" label="Course" value={course} onChange={(v) => { setCourse(v); setQuery("course", v); }} options={[{ value: "", label: "All courses" }, ...data.courses.map((c) => ({ value: c.id, label: c.title || "Untitled course" }))]} />
          {companies.length > 0 && <ToolSelect id="rt-pws-lrn-company" label="Company" value={company} onChange={(v) => { setCompany(v); setQuery("company", v); }} options={[{ value: "", label: "All companies" }, ...companies.map((c) => ({ value: c, label: c }))]} />}
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={csv} disabled={!list.length}>Download CSV</button>
        </div>
      </div>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "learner" : "learners"}`}</p>
      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr><th scope="col">Learner</th><th scope="col">Phone</th><th scope="col">Company</th><th scope="col">Bookings</th><th scope="col">Last booking</th><th scope="col">Certificates</th></tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id}>
                  <td data-label="Learner"><Link href={`/provider/learners/${l.id}`} className="rt-adm-strong">{learnerName(l)}</Link><small>{l.email}</small></td>
                  <td data-label="Phone">{l.phone || "Not given"}</td>
                  <td data-label="Company">{l.company || "None"}</td>
                  <td data-label="Bookings">{l.booked}</td>
                  <td data-label="Last booking">{l.lastAt ? formatOrderDay(l.lastAt) : "None"}</td>
                  <td data-label="Certificates">{l.certs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rt-acc__card rt-acc__empty">No learners match. Try another name, course or company.</p>
      )}
    </div>
  );
}
