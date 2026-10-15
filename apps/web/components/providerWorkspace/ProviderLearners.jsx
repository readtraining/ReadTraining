"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import CataloguePagination from "@/components/courses/CataloguePagination";
import { useProvider } from "@/lib/providerWorkspace";
import { Empty, Loading, getQuery, setQuery } from "./providerParts";
import { formatOrderDay } from "./moneyParts";

const PER_PAGE = 10;
const FIELDS = [
  { key: "first", label: "First name", type: "text", icon: "icon-person" },
  { key: "last", label: "Last name", type: "text", icon: "icon-person" },
  { key: "email", label: "Email", type: "email", icon: "icon-email" },
  { key: "phone", label: "Phone", type: "tel", icon: "icon-message" },
];
const BLANK = { first: "", last: "", email: "", phone: "" };

// Learners: Hurak's four searches (first name, last name, email, phone; kept in the address) and its columns (name, email, contact
// number, View), 10 a page, in our layout: one filter bar, and a table with each learner's initials, town, bookings and last booking.
export default function ProviderLearners() {
  const data = useProvider();
  const [f, setF] = useState(BLANK);
  const [page, setPage] = useState(1);
  useEffect(() => {
    setF(Object.fromEntries(FIELDS.map((x) => [x.key, getQuery(x.key) || ""])));
  }, []);
  useEffect(() => setPage(1), [f]);
  if (!data) return <Loading rows={2} />;
  if (!data.learners.length) {
    return <Empty title="No learners yet" text="Once people book your courses, you can see their bookings here." action={{ href: "/provider/orders/new", label: "Create order" }} />;
  }

  const has = (v, needle) => !needle.trim() || String(v || "").toLowerCase().replace(/\s/g, "").includes(needle.trim().toLowerCase().replace(/\s/g, ""));
  const orderAt = (ref) => data.orders.find((o) => o.ref === ref)?.at || 0;
  const list = data.learners
    .filter((l) => has(l.first, f.first) && has(l.last, f.last) && has(l.email, f.email) && has(l.phone, f.phone))
    .map((l) => {
      const mine = data.enrolments.filter((e) => e.learnerId === l.id);
      return { ...l, bookings: mine.length, lastAt: mine.reduce((m, e) => Math.max(m, orderAt(e.orderRef)), 0) };
    })
    .sort((a, b) => a.first.localeCompare(b.first) || a.last.localeCompare(b.last));
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const at = Math.min(page, pages);
  const rows = list.slice((at - 1) * PER_PAGE, at * PER_PAGE);
  const filtered = Object.values(f).some((v) => v.trim());
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setQuery(k, v.trim()); };
  const clear = () => { setF(BLANK); FIELDS.forEach((x) => setQuery(x.key, "")); };

  return (
    <div className="rt-acc__stack">
      <div className="rt-lr-find" role="search" aria-label="Find learners">
        {FIELDS.map((x) => (
          <div className="rt-lr-find__field" key={x.key}>
            <label htmlFor={`rt-lrn-${x.key}`}>{x.label}</label>
            <span className="rt-lr-find__input">
              <i className={`${x.icon} text-14`} aria-hidden="true"></i>
              <input id={`rt-lrn-${x.key}`} type={x.type} value={f[x.key]} placeholder={x.label} onChange={(e) => set(x.key, e.target.value)} autoComplete="off" spellCheck={false} />
            </span>
          </div>
        ))}
      </div>
      <div className="rt-lr-count">
        <p aria-live="polite"><b>{list.length}</b> {list.length === 1 ? "learner" : "learners"}{filtered ? " match" : ""}</p>
        {filtered && <button type="button" className="rt-cd__link" onClick={clear}>Clear filters</button>}
      </div>
      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard rt-lr-table">
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr><th scope="col">Name</th><th scope="col">Email address</th><th scope="col">Contact number</th><th scope="col">Town</th><th scope="col">Bookings</th><th scope="col">Last booking</th><th scope="col"><span className="rt-sr">Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td data-label="Name">
                    <span className="rt-lr-who">
                      <span className="rt-lr-avatar" aria-hidden="true">{`${l.first[0] || ""}${l.last[0] || ""}`.toUpperCase()}</span>
                      <span><Link href={`/provider/learners/${l.id}`} className="rt-adm-strong">{l.first} {l.last}</Link>{l.company && <small>{l.company}</small>}</span>
                    </span>
                  </td>
                  <td data-label="Email address">{l.email}</td>
                  <td data-label="Contact number">{l.phone || "—"}</td>
                  <td data-label="Town">{l.town || "—"}</td>
                  <td data-label="Bookings" className="rt-pws-money__num">{l.bookings}</td>
                  <td data-label="Last booking">{l.lastAt ? formatOrderDay(l.lastAt) : "—"}</td>
                  <td data-label="Actions"><Link href={`/provider/learners/${l.id}`} className="rt-lr-view">View<span className="rt-sr"> {l.first} {l.last}</span><i className="icon-chevron-right text-10" aria-hidden="true"></i></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && <div className="rt-pws-coh__pages"><CataloguePagination page={at} totalPages={pages} hrefFor={(p) => `?page=${p}`} onNavigate={setPage} /></div>}
        </div>
      ) : (
        <div className="rt-acc__card rt-acc__empty">
          <p>No learners match these details.</p>
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={clear}>Clear filters</button>
        </div>
      )}
    </div>
  );
}
