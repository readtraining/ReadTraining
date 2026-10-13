"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/testPrep/runner/Sheet";
import { pw } from "@/data/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import { cohortSpan, deleteFaq, deletePackage, deleteVenue, saveFaq, saveVenue, setPackageActive, setVenueActive } from "@/lib/providerWorkspace";
import PackageEditor from "./PackageEditor";
import { Empty, Pill, Search, Tabs, Toggle, ToolSelect, formatDay } from "./providerParts";
import { Confirm, Field, aria, isPostcode, tidyPostcode, useParam } from "./settingsForm";

// Settings › FAQs, Venues and Price packages: the provider's reusable libraries. Each is a list with search and filters (kept
// in the address), an add / edit panel (several at once when adding), and delete, which is blocked while something still uses
// the item.

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const Count = ({ n, one, many }) => <p className="rt-sr" aria-live="polite">{plural(n, one, many)}</p>;

// ---- FAQs ------------------------------------------------------------------------------------------------------------------

export function FaqsTab({ data, say }) {
  const [q, setQ] = useParam("q");
  const [editing, setEditing] = useState(null); // null | { id?, rows: [{ q, a }] }
  const [errors, setErrors] = useState({});
  const [removing, setRemoving] = useState(null);
  const formRef = useRef(null);
  const usedIn = (id) => data.courses.filter((c) => c.faqs.includes(id)).length;
  const needle = q.trim().toLowerCase();
  const list = data.faqs.filter((f) => !needle || `${f.q} ${f.a}`.toLowerCase().includes(needle));

  const open = (f) => {
    setErrors({});
    setEditing(f ? { id: f.id, rows: [{ q: f.q, a: f.a }] } : { rows: [{ q: "", a: "" }] });
  };
  const setRow = (i, patch) => setEditing((x) => ({ ...x, rows: x.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    editing.rows.forEach((r, i) => {
      if (!r.q.trim()) errs[`q${i}`] = "Enter the question.";
      if (!r.a.trim()) errs[`a${i}`] = "Enter the answer.";
    });
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    editing.rows.forEach((r) => saveFaq({ ...(editing.id ? { id: editing.id } : {}), q: r.q.trim(), a: r.a.trim() }));
    say(editing.id ? "FAQ saved" : editing.rows.length > 1 ? `${editing.rows.length} FAQs added` : "FAQ added");
    setEditing(null);
  };

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Search value={q} onChange={setQ} label="Search FAQs" />
        <button type="button" className="button -md -purple-1 text-white" onClick={() => open(null)}>Add FAQ</button>
      </div>
      <Count n={list.length} one="FAQ" />
      {data.faqs.length === 0 ? (
        <Empty title="No FAQs yet" text="Add the questions learners ask most, then pick them on each course." action={{ label: "Add FAQ", onClick: () => open(null) }} />
      ) : list.length === 0 ? (
        <p className="rt-acc__card rt-acc__empty">No FAQs match “{q}”.</p>
      ) : (
        <ul className="rt-adm-items">
          {list.map((f) => {
            const n = usedIn(f.id);
            return (
              <li key={f.id} className="rt-acc__card rt-adm-item">
                <div className="rt-adm-item__body">
                  <p className="rt-pws-set__title">{f.q}</p>
                  <p className="rt-pws-set__clamp">{f.a}</p>
                  <p className="rt-adm-muted">{n ? `Used in ${plural(n, "course")}` : "Not used on a course yet"}</p>
                </div>
                <div className="rt-adm-item__actions">
                  <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => open(f)}>Edit<span className="rt-sr">: {f.q}</span></button>
                  <button type="button" className="rt-pws-set__textbtn rt-adm-danger" onClick={() => setRemoving(f)}>Delete<span className="rt-sr">: {f.q}</span></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? "Edit FAQ" : "Add FAQs"} closeLabel="Close" className="rt-pws-set__sheet">
        {editing && (
          <form className="rt-q__form" onSubmit={submit} noValidate ref={formRef}>
            {!editing.id && <p className="rt-acc__note">Once added, you can use an FAQ on any of your courses.</p>}
            {editing.rows.map((r, i) => (
              <fieldset key={i} className="rt-pws-set__repeat">
                {editing.rows.length > 1 && <legend>FAQ {i + 1}</legend>}
                <Field id={`rt-faq-q${i}`} label="Question" error={errors[`q${i}`]}>
                  <input {...aria(`rt-faq-q${i}`, errors[`q${i}`])} type="text" maxLength={160} autoComplete="off" value={r.q} onChange={(e) => setRow(i, { q: e.target.value })} />
                </Field>
                <Field id={`rt-faq-a${i}`} label="Answer" error={errors[`a${i}`]}>
                  <textarea {...aria(`rt-faq-a${i}`, errors[`a${i}`])} rows={4} maxLength={1200} autoComplete="off" value={r.a} onChange={(e) => setRow(i, { a: e.target.value })} />
                </Field>
                {editing.rows.length > 1 && <button type="button" className="rt-pws-set__textbtn" onClick={() => setEditing((x) => ({ ...x, rows: x.rows.filter((_, j) => j !== i) }))}>Remove FAQ {i + 1}</button>}
              </fieldset>
            ))}
            {!editing.id && editing.rows.length < 10 && <button type="button" className="button -sm -outline-purple-1 text-purple-1 rt-pws-set__start" onClick={() => setEditing((x) => ({ ...x, rows: [...x.rows, { q: "", a: "" }] }))}>Add another</button>}
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{editing.id ? "Save FAQ" : editing.rows.length > 1 ? `Add ${editing.rows.length} FAQs` : "Add FAQ"}</button>
          </form>
        )}
      </Sheet>

      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this FAQ?" confirmLabel="Delete FAQ"
        text={removing ? `“${removing.q}”${usedIn(removing.id) ? ` will also be removed from ${plural(usedIn(removing.id), "course")}.` : " is not used on any course."}` : ""}
        onConfirm={() => { deleteFaq(removing.id); setRemoving(null); say("FAQ deleted"); }} />
    </div>
  );
}

// ---- venues ----------------------------------------------------------------------------------------------------------------

const blankVenue = () => ({ name: "", street: "", city: "", postcode: "" });
export function VenuesTab({ data, say }) {
  const [status, setStatus] = useParam("status", "active");
  const [q, setQ] = useParam("q");
  const [city, setCity] = useParam("city", "all");
  const [editing, setEditing] = useState(null); // { id?, rows }
  const [errors, setErrors] = useState({});
  const [removing, setRemoving] = useState(null);
  const [blocked, setBlocked] = useState("");
  const formRef = useRef(null);

  const today = data.today;
  const uses = (id) => {
    const ks = data.cohorts.filter((k) => k.venueId === id && !k.cancelled);
    return { all: ks.length, upcoming: ks.filter((k) => cohortSpan(k).last >= today).length };
  };
  const cities = [...new Set(data.venues.map((v) => v.city))].sort();
  const needle = q.trim().toLowerCase();
  const inStatus = (v) => (status === "archived" ? !v.active : v.active);
  const list = data.venues.filter((v) => inStatus(v) && (city === "all" || v.city === city) && (!needle || `${v.name} ${v.street} ${v.city} ${v.postcode}`.toLowerCase().includes(needle)));
  const tabs = [
    { key: "active", label: "Active", count: data.venues.filter((v) => v.active).length },
    { key: "archived", label: "Archived", count: data.venues.filter((v) => !v.active).length },
  ];

  const open = (v) => {
    setErrors({});
    setEditing(v ? { id: v.id, rows: [{ name: v.name, street: v.street, city: v.city, postcode: v.postcode }] } : { rows: [blankVenue()] });
  };
  const setRow = (i, patch) => setEditing((x) => ({ ...x, rows: x.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    editing.rows.forEach((r, i) => {
      if (!r.name.trim()) errs[`name${i}`] = "Enter the venue's name.";
      if (!r.street.trim()) errs[`street${i}`] = "Enter the street address.";
      if (!r.city.trim()) errs[`city${i}`] = "Enter the town or city.";
      if (!isPostcode(r.postcode)) errs[`postcode${i}`] = "Enter a UK postcode, like LS1 4DL.";
    });
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    editing.rows.forEach((r) => saveVenue({ ...(editing.id ? { id: editing.id } : {}), name: r.name.trim(), street: r.street.trim(), city: r.city.trim(), postcode: tidyPostcode(r.postcode) }));
    say(editing.id ? "Venue saved" : editing.rows.length > 1 ? `${editing.rows.length} venues added` : "Venue added");
    setEditing(null);
  };
  const askDelete = (v) => {
    setBlocked("");
    setRemoving(v);
  };
  const doDelete = () => {
    if (deleteVenue(removing.id) === false) {
      setBlocked("This venue has upcoming cohorts. Move them to another venue first, or archive the venue so it can't be picked for new ones.");
      return;
    }
    setRemoving(null);
    say("Venue deleted");
  };

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={status} onChange={setStatus} label="Show venues" />
        <div className="rt-adm-toolbar__end">
          <Search value={q} onChange={setQ} label="Search venues" />
          <ToolSelect id="rt-ven-city" label="Town or city" value={city} onChange={setCity} options={[{ value: "all", label: "All towns" }, ...cities.map((c) => ({ value: c, label: c }))]} />
          <button type="button" className="button -md -purple-1 text-white" onClick={() => open(null)}>Add venue</button>
        </div>
      </div>
      <Count n={list.length} one="venue" />
      {data.venues.length === 0 ? (
        <Empty title="No venues yet" text="Add the places you run courses, then pick them on each course and cohort." action={{ label: "Add venue", onClick: () => open(null) }} />
      ) : list.length === 0 ? (
        <p className="rt-acc__card rt-acc__empty">No {status === "archived" ? "archived" : "active"} venues match.</p>
      ) : (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table">
            <thead><tr><th scope="col">Venue</th><th scope="col">Address</th><th scope="col">Cohorts</th><th scope="col">Status</th><th scope="col"><span className="rt-sr">Actions</span></th></tr></thead>
            <tbody>
              {list.map((v) => {
                const u = uses(v.id);
                return (
                  <tr key={v.id}>
                    <td data-label="Venue"><b>{v.name}</b></td>
                    <td data-label="Address">{v.street}<small>{v.city} · {v.postcode}</small></td>
                    <td data-label="Cohorts">{u.all ? plural(u.all, "cohort") : "None"}{u.upcoming > 0 && <small>{u.upcoming} upcoming</small>}</td>
                    <td data-label="Status"><Pill tone={v.active ? "ok" : "muted"}>{v.active ? "Active" : "Archived"}</Pill></td>
                    <td data-label="Actions">
                      <div className="rt-adm-rowactions">
                        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => open(v)}>Edit<span className="rt-sr"> {v.name}</span></button>
                        <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setVenueActive(v.id, !v.active); say(v.active ? `${v.name} archived` : `${v.name} restored`); }}>{v.active ? "Archive" : "Restore"}<span className="rt-sr"> {v.name}</span></button>
                        <button type="button" className="rt-pws-set__textbtn rt-adm-danger" onClick={() => askDelete(v)}>Delete<span className="rt-sr"> {v.name}</span></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="rt-acc__note">Archived venues stay on past cohorts but can't be picked for new ones.</p>

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? "Edit venue" : "Add venues"} closeLabel="Close" className="rt-pws-set__sheet">
        {editing && (
          <form className="rt-q__form" onSubmit={submit} noValidate ref={formRef}>
            {editing.rows.map((r, i) => (
              <fieldset key={i} className="rt-pws-set__repeat">
                {editing.rows.length > 1 && <legend>Venue {i + 1}</legend>}
                <Field id={`rt-ven-name${i}`} label="Venue name" error={errors[`name${i}`]}>
                  <input {...aria(`rt-ven-name${i}`, errors[`name${i}`])} type="text" maxLength={80} autoComplete="organization" placeholder="For example: Northfield Training Centre" value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
                </Field>
                <Field id={`rt-ven-street${i}`} label="Street address" error={errors[`street${i}`]}>
                  <input {...aria(`rt-ven-street${i}`, errors[`street${i}`])} type="text" maxLength={120} autoComplete="address-line1" value={r.street} onChange={(e) => setRow(i, { street: e.target.value })} />
                </Field>
                <div className="rt-pws-set__grid -two">
                  <Field id={`rt-ven-city${i}`} label="Town or city" error={errors[`city${i}`]}>
                    <input {...aria(`rt-ven-city${i}`, errors[`city${i}`])} type="text" maxLength={60} autoComplete="address-level2" value={r.city} onChange={(e) => setRow(i, { city: e.target.value })} />
                  </Field>
                  <Field id={`rt-ven-pc${i}`} label="Postcode" error={errors[`postcode${i}`]}>
                    <input {...aria(`rt-ven-pc${i}`, errors[`postcode${i}`])} type="text" maxLength={8} autoComplete="postal-code" value={r.postcode} onChange={(e) => setRow(i, { postcode: e.target.value })} onBlur={() => isPostcode(r.postcode) && setRow(i, { postcode: tidyPostcode(r.postcode) })} />
                  </Field>
                </div>
                {editing.rows.length > 1 && <button type="button" className="rt-pws-set__textbtn" onClick={() => setEditing((x) => ({ ...x, rows: x.rows.filter((_, j) => j !== i) }))}>Remove venue {i + 1}</button>}
              </fieldset>
            ))}
            {!editing.id && editing.rows.length < 10 && <button type="button" className="button -sm -outline-purple-1 text-purple-1 rt-pws-set__start" onClick={() => setEditing((x) => ({ ...x, rows: [...x.rows, blankVenue()] }))}>Add another venue</button>}
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block">{editing.id ? "Save venue" : editing.rows.length > 1 ? `Add ${editing.rows.length} venues` : "Add venue"}</button>
          </form>
        )}
      </Sheet>

      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this venue?" confirmLabel="Delete venue" blocked={blocked}
        text={removing ? `${removing.name} will be removed from your courses. Past cohorts keep their details.` : ""} onConfirm={doDelete} />
    </div>
  );
}

// ---- price packages --------------------------------------------------------------------------------------------------------

const SORTS = [
  { value: "new", label: "Newest first" },
  { value: "old", label: "Oldest first" },
  { value: "name", label: "Name A to Z" },
];
export function PricingTab({ data, say }) {
  const [status, setStatus] = useParam("status", "active");
  const [q, setQ] = useParam("q");
  const [course, setCourse] = useParam("course", "all");
  const [sort, setSort] = useParam("sort", "new");
  const [editor, setEditor] = useState({ open: false, id: null });
  const [showing, setShowing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const usedBy = (id) => data.courses.filter((c) => c.pricing.type === "tiered" && c.pricing.packageId === id);
  const needle = q.trim().toLowerCase();
  const list = data.packages
    .filter((p) => (status === "archived" ? !p.active : p.active))
    .filter((p) => !needle || p.name.toLowerCase().includes(needle))
    .filter((p) => course === "all" || usedBy(p.id).some((c) => c.id === course))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "old" ? a.created - b.created : b.created - a.created));
  const tabs = [
    { key: "active", label: "Active", count: data.packages.filter((p) => p.active).length },
    { key: "archived", label: "Archived", count: data.packages.filter((p) => !p.active).length },
  ];
  const tiered = data.courses.filter((c) => c.pricing.type === "tiered");

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Tabs tabs={tabs} value={status} onChange={setStatus} label="Show packages" />
        <div className="rt-adm-toolbar__end">
          <Search value={q} onChange={setQ} label="Search packages" />
          <ToolSelect id="rt-pkg-course" label="Course" value={course} onChange={setCourse} options={[{ value: "all", label: "All courses" }, ...tiered.map((c) => ({ value: c.id, label: c.title || "Untitled course" }))]} />
          <ToolSelect id="rt-pkg-sort" label="Sort" value={sort} onChange={setSort} options={SORTS} />
          <button type="button" className="button -md -purple-1 text-white" onClick={() => setEditor({ open: true, id: null })}>Create package</button>
        </div>
      </div>
      <Count n={list.length} one="package" />
      {data.packages.length === 0 ? (
        <Empty title="No packages yet" text="Create Saver, Flexi and Premium options once, then use them on any tiered course." action={{ label: "Create package", onClick: () => setEditor({ open: true, id: null }) }} />
      ) : list.length === 0 ? (
        <p className="rt-acc__card rt-acc__empty">No {status === "archived" ? "archived" : "active"} packages match.</p>
      ) : (
        <ul className="rt-adm-items">
          {list.map((p) => {
            const used = usedBy(p.id);
            return (
              <li key={p.id} className="rt-acc__card rt-adm-item rt-pws-pkg__row">
                <div className="rt-adm-item__body">
                  <p className="rt-pws-set__title">{p.name || "Untitled package"}</p>
                  <ul className="rt-pws-pkg__chips" aria-label="Prices">
                    {pw.tiers.map((t) => <li key={t.key}>{t.label} {formatPrice(p.tiers[t.key]?.price || 0)}</li>)}
                  </ul>
                  <p className="rt-adm-muted">{used.length ? `Used on ${used.map((c) => c.title || "Untitled course").join(", ")}` : "Not used on a course yet"} · Created {formatDay(p.created)}</p>
                </div>
                <div className="rt-adm-item__actions">
                  <Toggle id={`rt-pkg-on-${p.id}`} checked={p.active} label="Active" onChange={(on) => { setPackageActive(p.id, on); say(on ? `${p.name} is active` : `${p.name} archived`); }} />
                  <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditor({ open: true, id: p.id })}>Edit<span className="rt-sr"> {p.name}</span></button>
                  <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setShowing(p)}>Courses<span className="rt-sr"> using {p.name}</span></button>
                  <button type="button" className="rt-pws-set__textbtn rt-adm-danger" onClick={() => setRemoving(p)}>Delete<span className="rt-sr"> {p.name}</span></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="rt-acc__note">Archived packages stay on the courses that use them, but can't be picked for other courses.</p>

      <PackageEditor open={editor.open} packageId={editor.id} onClose={() => setEditor((x) => ({ ...x, open: false }))} onSaved={() => say(editor.id ? "Package saved" : "Package created")} />

      <Sheet open={Boolean(showing)} onClose={() => setShowing(null)} title={showing ? `Courses using ${showing.name}` : ""} closeLabel="Close" className="rt-pws-set__sheet">
        {showing && (usedBy(showing.id).length ? (
          <ul className="rt-adm-list">
            {usedBy(showing.id).map((c) => (
              <li key={c.id}>
                <div><Link href={`/provider/courses/${c.id}?tab=pricing`} className="rt-adm-strong">{c.title || "Untitled course"}</Link><small>{pw.courseStatuses[c.status]}</small></div>
              </li>
            ))}
          </ul>
        ) : <p className="rt-acc__note">No course uses this package yet. Choose it on a course's Pricing tab.</p>)}
      </Sheet>

      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this package?" confirmLabel="Delete package"
        text={removing ? `${removing.name || "This package"} and its perks will be deleted.` : ""}
        blocked={removing && usedBy(removing.id).length ? `${plural(usedBy(removing.id).length, "course")} still use this package. Choose another price on ${usedBy(removing.id).length === 1 ? "that course" : "those courses"} first, or archive the package.` : ""}
        onConfirm={() => { if (deletePackage(removing.id) !== false) say("Package deleted"); setRemoving(null); }} />
    </div>
  );
}
