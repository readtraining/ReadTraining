"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import CataloguePagination from "@/components/courses/CataloguePagination";
import { useProvider } from "@/lib/providerWorkspace";
import { Loading, Search, getQuery, setQuery } from "./providerParts";
import { formatOrderDay } from "./moneyParts";
import { EmptyState } from "@/components/states/States";

const PER_PAGE = 10;
// Learners: Hurak's searches (first name, last name, email, phone), as one search box in the workspace's filter bar (as on Courses;
// kept in the address), and its columns (name, email, contact number, View), 10 a page, with each learner's initials, town, bookings
// and last booking.
export default function ProviderLearners() {
  const data = useProvider();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    setQ(getQuery("q") || "");
  }, []);
  useEffect(() => setPage(1), [q]);
  if (!data) return <Loading rows={2} />;
  if (!data.learners.length) {
    return <EmptyState title="No learners yet" text="Once people book your courses, you can see their bookings here." action={{ href: "/provider/orders/new", label: "Create order" }} />;
  }

  // every word typed must be found in the learner's name, email or phone (a phone number matches with or without its spaces)
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const found = (l) => { const hay = `${l.first} ${l.last} ${l.email} ${l.phone || ""} ${String(l.phone || "").replace(/\s/g, "")}`.toLowerCase(); return words.every((w) => hay.includes(w)); };
  const orderAt = (ref) => data.orders.find((o) => o.ref === ref)?.at || 0;
  const list = data.learners
    .filter(found)
    .map((l) => {
      const mine = data.enrolments.filter((e) => e.learnerId === l.id);
      return { ...l, bookings: mine.length, lastAt: mine.reduce((m, e) => Math.max(m, orderAt(e.orderRef)), 0) };
    })
    .sort((a, b) => a.first.localeCompare(b.first) || a.last.localeCompare(b.last));
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const at = Math.min(page, pages);
  const rows = list.slice((at - 1) * PER_PAGE, at * PER_PAGE);
  const filtered = words.length > 0;
  const search = (v) => { setQ(v); setQuery("q", v.trim()); };
  const clear = () => search("");

  return (
    <div className="rt-acc__stack">
      <div className="rt-cx" role="search" aria-label="Find learners">
        <div className="rt-cx__bar">
          <Search value={q} onChange={search} label="Name, email or phone" />
        </div>
      </div>
      <div className="rt-lr-count">
        <p aria-live="polite"><b>{list.length}</b> {list.length === 1 ? "learner" : "learners"}{filtered ? " match" : ""}</p>
        {filtered && <button type="button" className="rt-cd__link" onClick={clear}>Clear filters</button>}
      </div>
      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard rt-lr-table">
          <table className="rt-biz__table rt-adm-table">
            <thead>
              <tr><th scope="col">Name</th><th scope="col">Email address</th><th scope="col">Contact number</th><th scope="col">Town</th><th scope="col">Bookings</th><th scope="col">Last booking</th></tr>
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
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && <div className="rt-pws-coh__pages"><CataloguePagination page={at} totalPages={pages} hrefFor={(p) => `?page=${p}`} onNavigate={setPage} /></div>}
        </div>
      ) : (
        <EmptyState title="No learners match these details." action={{ label: "Clear filters", onClick: clear }} />
      )}
    </div>
  );
}
