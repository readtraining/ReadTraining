"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sheet from "@/components/testPrep/runner/Sheet";
import { admin as A } from "@/data/admin";
import { basket } from "@/data/basket";
import { api } from "@/lib/trpc/react";
import { useAdminAccess } from "@/lib/adminContext";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { categoryOptions, methodName, subcategoryOptions, topicOptions } from "@/lib/taxonomy";
import { Search, Tabs, getQuery, setQuery, useSort, SortTh, Pager, usePaging, TableSkeleton } from "./adminParts";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import { EmptyState, ErrorState } from "@/components/states/States";
import AdminCatalogueList from "./AdminCatalogueList";
import { AdminStatus, AdminTag } from "./AdminStatus";
import { SHOW_DEMO } from "@/lib/demo";

const copy = A.catalogue;
const TABS = ["courses", "list", "packages"];
const KINDS = ["all", "shared", "provider"];

const COURSE_SORT = { course: (c) => c.title, providers: (c) => c.providers, sessions: (c) => c.upcoming, from: (c) => c.fromPence ?? Infinity };

// The catalogue: Courses (API admin.courses: the shared course pages and every provider's course, with search, kind and status
// filters, the table with status, providers on a shared page, upcoming dates and the "From" price; 20 at a time with "Show more";
// "New shared page" for admins with the catalogue switch), Categories and filters (the real list, AdminCatalogueList) and Packages
// and add-ons (DEMO: the basket's Saver / Flexi packages and the first aid add-on). Tabs and filters in the address.
export default function AdminCatalogue() {
  const me = useAdminAccess();
  const [tab, setTab] = useState("courses");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const pages = usePaging({ key: "", dir: -1 });
  const sorter = useSort();
  const list = api.admin.courses.list.useQuery({ kind, status, q: q.trim() || undefined }, { enabled: tab === "courses", placeholderData: (prev) => prev });
  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t) && (SHOW_DEMO || t !== "packages")) setTab(t);
    const k = getQuery("kind");
    if (KINDS.includes(k)) setKind(k);
    const s = getQuery("status");
    if (copy.statuses[s]) setStatus(s);
  }, []);

  const cols = copy.columns;
  // the packages are DEMO: on the live site only the real courses and catalogue settings (lib/demo.js)
  const tabs = [{ key: "courses", label: copy.tabs.courses }, { key: "list", label: copy.tabs.list }, ...(SHOW_DEMO ? [{ key: "packages", label: copy.tabs.packages }] : [])];
  const pick = (setter, key, fallback) => (v) => {
    setter(v);
    pages.restart();
    setQuery(key, v === fallback ? "" : v);
  };
  const rows = list.data || [];

  return (
    <div className="rt-acc__stack">
      <Tabs tabs={tabs} value={tab} onChange={(t) => { setTab(t); setQuery("tab", t === "courses" ? "" : t); }} label="Show catalogue" />

      {tab === "courses" && (
        <>
          <div className="rt-adm-toolbar">
            <div className="rt-adm-seg" role="group" aria-label="Kind of course">
              {KINDS.map((k) => (
                <button key={k} type="button" className={kind === k ? "is-on" : undefined} aria-pressed={kind === k} onClick={() => pick(setKind, "kind", "all")(k)}>{copy.kinds[k]}</button>
              ))}
            </div>
            <div className="rt-field rt-adm-select">
              <label htmlFor="rt-adm-cstatus" className="rt-sr">Status</label>
              <FieldSelect id="rt-adm-cstatus" label="Status" value={status} onChange={pick(setStatus, "status", "all")} options={[{ value: "all", label: "Every status" }, ...Object.entries(copy.statuses).map(([value, label]) => ({ value, label }))]} compact />
            </div>
            <Search value={q} onChange={(v) => { setQ(v); pages.restart(); }} label={copy.search} />
            {me?.permissions?.includes("catalogue") && <button type="button" className="button -sm -purple-1 text-white" onClick={() => setCreating(true)}>{copy.newShared}</button>}
          </div>
          <p className="rt-sr" aria-live="polite">{list.data ? `${rows.length} ${rows.length === 1 ? "course" : "courses"}` : ""}</p>
          {list.isError ? (
            <ErrorState title="We couldn't load the courses." text="Check your connection, then try again." onRetry={() => list.refetch()} />
          ) : !list.data ? (
            <TableSkeleton />
          ) : rows.length ? (
            <div className="rt-acc__card rt-biz__tablecard">
              <table className="rt-biz__table rt-adm-table">
                <thead>
                  <tr><SortTh label={cols.course} col="course" sorter={sorter} /><th scope="col">{cols.status}</th><SortTh label={cols.providers} col="providers" sorter={sorter} numeric /><SortTh label={cols.sessions} col="sessions" sorter={sorter} numeric /><SortTh label={cols.from} col="from" sorter={sorter} numeric /></tr>
                </thead>
                <tbody>
                  {sorter.apply(rows, COURSE_SORT).slice((pages.page - 1) * pages.limit, pages.page * pages.limit).map((c) => (
                    <tr key={c.id}>
                      <td data-label={cols.course}>
                        <Link href={`/admin/catalogue/${c.id}`} className="rt-adm-strong">{c.title}</Link>
                        <small>{c.kind === "shared" ? copy.kind.shared : [c.provider, methodName(c.method), c.parent ? `on ${c.parent}` : ""].filter(Boolean).join(" · ")}</small>
                      </td>
                      <td data-label={cols.status}>
                        <AdminStatus kind="course" status={c.status}>{copy.statuses[c.status]}</AdminStatus>
                        {c.pendingChange && <small>Change waiting</small>}
                      </td>
                      <td data-label={cols.providers}>{c.kind === "shared" ? c.providers : <span className="rt-adm-muted">–</span>}</td>
                      <td data-label={cols.sessions}>{c.method === "self-paced" ? <span className="rt-adm-muted">Any time</span> : c.upcoming}</td>
                      <td data-label={cols.from}>{c.fromPence != null ? formatPrice(c.fromPence / 100) : <span className="rt-adm-muted">–</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="rt-adm-more"><Pager paging={pages} total={rows.length} label="courses" /></div>
            </div>
          ) : (
            <EmptyState title={copy.empty} action={me?.permissions?.includes("catalogue") && kind !== "provider" && !q && status === "all" ? { label: copy.newShared, onClick: () => setCreating(true) } : null} />
          )}
          <NewSharedPage open={creating} onClose={() => setCreating(false)} />
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

// A new shared course page: its title and its place in the catalogue. Then the editor opens to write the rest.
function NewSharedPage({ open, onClose }) {
  const router = useRouter();
  const create = api.admin.courses.createShared.useMutation();
  const [f, setF] = useState({ title: "", category: "", subcategory: "", topic: "" });
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  useEffect(() => {
    if (open) {
      setF({ title: "", category: "", subcategory: "", topic: "" });
      setErrors({});
    }
  }, [open]);
  const subs = subcategoryOptions(f.category);
  const topics = topicOptions(f.category, f.subcategory);
  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (f.title.trim().length < 3) err.title = "Enter a title of at least 3 characters, like Door Supervisor.";
    if (!f.category) err.category = "Choose a category.";
    if (!f.subcategory) err.subcategory = "Choose a sub-category.";
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(ref.current);
    create.mutate({ title: f.title.trim(), category: f.category, subcategory: f.subcategory, topic: f.topic || null }, {
      onSuccess: ({ id }) => router.push(`/admin/catalogue/${id}/edit`),
      onError: (er) => { const { fields, general } = errorsFrom(er); setErrors({ ...fields, form: general }); },
    });
  };
  const Err = ({ k }) => (errors[k] ? <p className="rt-q__err" id={`rt-adm-ns-${k}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p> : null);
  return (
    <Sheet open={open} onClose={onClose} title={copy.newShared} closeLabel="Close">
      <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate ref={ref}>
        <p className="rt-acc__note">{copy.newSharedNote}</p>
        <div className="rt-field">
          <label htmlFor="rt-adm-ns-title">Course name</label>
          <Err k="title" />
          <input id="rt-adm-ns-title" value={f.title} maxLength={80} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="For example: SIA Door Supervisor" autoComplete="off" aria-invalid={errors.title ? true : undefined} aria-describedby={errors.title ? "rt-adm-ns-title-e" : undefined} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-adm-ns-category">Category</label>
          <Err k="category" />
          <FieldSelect id="rt-adm-ns-category" label="Category" placeholder="Choose a category" value={f.category} onChange={(v) => setF({ ...f, category: v, subcategory: "", topic: "" })} options={categoryOptions()} invalid={Boolean(errors.category)} describedBy={errors.category ? "rt-adm-ns-category-e" : undefined} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-adm-ns-subcategory">Sub-category</label>
          <Err k="subcategory" />
          <FieldSelect id="rt-adm-ns-subcategory" label="Sub-category" placeholder={f.category ? "Choose a sub-category" : "Choose a category first"} value={f.subcategory} onChange={(v) => setF({ ...f, subcategory: v, topic: "" })} options={subs} disabled={!f.category} invalid={Boolean(errors.subcategory)} describedBy={errors.subcategory ? "rt-adm-ns-subcategory-e" : undefined} />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-adm-ns-topic">Topic (optional)</label>
          <FieldSelect id="rt-adm-ns-topic" label="Topic" placeholder={topics.length ? "Choose a topic" : "No topics for this sub-category"} value={f.topic} onChange={(v) => setF({ ...f, topic: v })} options={topics} disabled={!topics.length} />
        </div>
        {errors.form && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{errors.form}</p>}
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={create.isPending} aria-busy={create.isPending || undefined}>{create.isPending ? "Creating…" : "Create and write the page"}</button>
      </form>
    </Sheet>
  );
}
