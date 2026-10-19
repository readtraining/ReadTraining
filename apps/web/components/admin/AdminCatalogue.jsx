"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { admin as A } from "@/data/admin";
import { basket } from "@/data/basket";
import { useAdmin } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { Pill, Search, Tabs, getQuery, setQuery, useSort, SortTh, Pager, usePaging, TableSkeleton } from "./adminParts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { EmptyState } from "@/components/states/States";
import AdminCatalogueList from "./AdminCatalogueList";

const copy = A.catalogue;
const TABS = ["courses", "list", "packages"];

const COURSE_SORT = { course: (c) => c.title, providers: (c) => c.offerings.length, sessions: (c) => c.upcoming, from: (c) => c.from };

// The catalogue: Courses (search, a category filter, the table with providers, upcoming dates, "From" price and the
// pre-course e-learning flag; 20 at a time with "Show more"; DEMO courses), Categories and filters (the real list,
// AdminCatalogueList) and Packages and add-ons (the basket's Saver / Flexi packages and the first aid add-on, as the basket applies them). Tabs in the address.
export default function AdminCatalogue() {
  const data = useAdmin();
  const [tab, setTab] = useState("courses");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const pages = usePaging({ key: "", dir: -1 });
  const sorter = useSort();
  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
    const c = getQuery("category");
    if (c) setCat(c);
  }, []);
  if (!data) return <TableSkeleton />;

  const { catalogue } = data;
  // the Courses tab's category filter: each category the demo courses use, with its count
  const categories = [...new Set(catalogue.map((c) => c.subject))]
    .map((key) => ({ key, label: catalogue.find((c) => c.subject === key).category, courses: catalogue.filter((c) => c.subject === key).length }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const needle = q.trim().toLowerCase();
  const list = catalogue.filter((c) => (cat === "all" || c.subject === cat) && (!needle || c.title.toLowerCase().includes(needle)));
  const cols = copy.columns;
  const tabs = [
    { key: "courses", label: copy.tabs.courses, count: catalogue.length },
    { key: "list", label: copy.tabs.list },
    { key: "packages", label: copy.tabs.packages },
  ];
  const pickCat = (k) => {
    setCat(k);
    pages.restart();
    setQuery("category", k === "all" ? "" : k);
  };

  return (
    <div className="rt-acc__stack">
      <Tabs tabs={tabs} value={tab} onChange={(t) => { setTab(t); setQuery("tab", t === "courses" ? "" : t); }} label="Show catalogue" />

      {tab === "courses" && (
        <>
          <div className="rt-adm-toolbar">
            <div className="rt-field rt-adm-select">
              <label htmlFor="rt-adm-cat" className="rt-sr">Category</label>
              <FieldSelect id="rt-adm-cat" label="Category" value={cat} onChange={pickCat} options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c.key, label: `${c.label} (${c.courses})` }))]} compact />
            </div>
            <Search value={q} onChange={(v) => { setQ(v); pages.restart(); }} label={copy.search} />
          </div>
          <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "course" : "courses"}`}</p>
          {list.length ? (
            <div className="rt-acc__card rt-biz__tablecard">
              <table className="rt-biz__table rt-adm-table">
                <thead>
                  <tr><SortTh label={cols.course} col="course" sorter={sorter} /><SortTh label={cols.providers} col="providers" sorter={sorter} numeric /><SortTh label={cols.sessions} col="sessions" sorter={sorter} numeric /><SortTh label={cols.from} col="from" sorter={sorter} numeric /><th scope="col">{cols.flags}</th></tr>
                </thead>
                <tbody>
                  {sorter.apply(list, COURSE_SORT).slice((pages.page - 1) * pages.limit, pages.page * pages.limit).map((c) => (
                    <tr key={c.id}>
                      <td data-label={cols.course}><Link href={`/admin/catalogue/${c.id}`} className="rt-adm-strong">{c.title}</Link><small>{c.category} · {c.duration}</small></td>
                      <td data-label={cols.providers}>{c.offerings.length}{c.offerings.some((o) => o.status === "paused") && <small>{c.offerings.filter((o) => o.status === "paused").length} paused</small>}</td>
                      <td data-label={cols.sessions}>{c.upcoming}</td>
                      <td data-label={cols.from}>{formatPrice(c.from)}</td>
                      <td data-label={cols.flags}>{c.preCourse ? <Pill tone="warn">{copy.preCourse}</Pill> : <span className="rt-adm-muted">None</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="rt-adm-more"><Pager paging={pages} total={list.length} label="courses" /></div>
            </div>
          ) : (
            <EmptyState title="No courses match." />
          )}
        </>
      )}

      {tab === "list" && <AdminCatalogueList />}

      {tab === "packages" && (
        <>
          <p className="rt-acc__note rt-adm-help">{copy.packagesNote}</p>
          <div className="rt-adm-grid2">
            {basket.packages.items.map((p) => (
              <section key={p.key} className="rt-acc__card" aria-labelledby={`rt-adm-pk-${p.key}`}>
                <div className="rt-acc__cardhead">
                  <h2 className="rt-acc__h2" id={`rt-adm-pk-${p.key}`}>{p.name}</h2>
                  <strong className="rt-adm-price">{p.price ? `+${formatPrice(p.price)}` : "Included"}</strong>
                </div>
                <dl className="rt-adm-dl">
                  {p.terms.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                  <div><dt>Applies to</dt><dd>Classroom courses in {basket.packages.subjects.join(", ")}</dd></div>
                </dl>
              </section>
            ))}
            <section className="rt-acc__card" aria-labelledby="rt-adm-pk-efaw">
              <div className="rt-acc__cardhead">
                <h2 className="rt-acc__h2" id="rt-adm-pk-efaw">Emergency First Aid at Work add-on</h2>
                <strong className="rt-adm-price">+{formatPrice(basket.firstAid.add.price)}</strong>
              </div>
              <dl className="rt-adm-dl">
                <div><dt>Was</dt><dd>{formatPrice(basket.firstAid.add.wasPrice)}</dd></div>
                <div><dt>Applies to</dt><dd>Classroom courses in {basket.firstAid.subjects.join(", ")}</dd></div>
                <div><dt>Shown as</dt><dd>{basket.firstAid.add.note}</dd></div>
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
