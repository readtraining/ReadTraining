"use client";

import React, { useCallback, useEffect, useState } from "react";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { formatPrice } from "@/lib/format";
import { clonePackage, deletePackage, setPackageActive, useProvider } from "@/lib/providerWorkspace";
import PackageEditor from "./PackageEditor";
import { Empty, Loading, RowMenu, Search, Toggle, ToolSelect, getQuery, setQuery } from "./providerParts";
import { Confirm } from "./settingsForm";

const ARCHIVE = [{ value: "", label: "All plans" }, { value: "active", label: "Active" }, { value: "archive", label: "Archive" }];

// Pricing plans (Hurak's Packages): search by plan title, filter by course and by Active / Archive (kept in the address). The
// table shows each plan's Saver, Flexi and Premium prices and whether it is archived; Edit, Clone package and Delete (blocked
// while a course uses it). "Create package" opens the plan editor.
export default function ProviderPackages() {
  const data = useProvider();
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("");
  const [archive, setArchive] = useState("");
  const [editor, setEditor] = useState({ open: false, id: null });
  const [removing, setRemoving] = useState(null);
  const [toast, setToast] = useState(null);
  const clearToast = useCallback(() => setToast(null), []);
  const say = (message) => setToast({ message });

  useEffect(() => {
    setQ(getQuery("q") || "");
    setCourse(getQuery("course") || "");
    const a = getQuery("archive");
    if (ARCHIVE.some((x) => x.value === a)) setArchive(a);
  }, []);
  if (!data) return <Loading rows={3} />;

  const usedBy = (id) => data.courses.filter((c) => c.pricing.type === "tiered" && c.pricing.packageId === id);
  const needle = q.trim().toLowerCase();
  const list = data.packages
    .filter((p) => !needle || (p.name || "").toLowerCase().includes(needle))
    .filter((p) => !course || usedBy(p.id).some((c) => c.id === course))
    .filter((p) => !archive || (archive === "archive" ? !p.active : p.active))
    .sort((a, b) => b.created - a.created);
  const filtered = Boolean(needle || course || archive);
  const setParam = (k, setter) => (v) => { setter(v); setQuery(k, k === "q" ? v.trim() : v); };
  const clear = () => {
    setQ(""); setCourse(""); setArchive("");
    ["q", "course", "archive"].forEach((k) => setQuery(k, ""));
  };
  const create = () => setEditor({ open: true, id: null });
  const clone = (p) => {
    const id = clonePackage(p.id);
    if (id) {
      say(`Copy of ${p.name || "the plan"} created`);
      setEditor({ open: true, id });
    }
  };

  if (!data.packages.length) {
    return (
      <>
        <Empty title="No pricing plans yet" text="Create Saver, Flexi and Premium options once, then use them on any tiered course." action={{ label: "Create package", onClick: create }} />
        <PackageEditor open={editor.open} packageId={editor.id} onClose={() => setEditor((x) => ({ ...x, open: false }))} onSaved={() => say("Package created")} />
        <Toast toast={toast} onDone={clearToast} />
      </>
    );
  }

  return (
    <div className="rt-acc__stack">
      <div className="rt-adm-toolbar">
        <Search value={q} onChange={setParam("q", setQ)} label="Search your plan title" />
        <div className="rt-adm-toolbar__end">
          <ToolSelect id="rt-pkg-course" label="Course" value={course} onChange={setParam("course", setCourse)} options={[{ value: "", label: "All courses" }, ...data.courses.map((c) => ({ value: c.id, label: c.title || "Untitled course" }))]} />
          <ToolSelect id="rt-pkg-archive" label="Archive" value={archive} onChange={setParam("archive", setArchive)} options={ARCHIVE} />
          {filtered && <button type="button" className="rt-cd__link" onClick={clear}>Clear filters</button>}
          <button type="button" className="button -md -purple-1 text-white" onClick={create}>Create package</button>
        </div>
      </div>
      <p className="rt-sr" aria-live="polite">{`${list.length} ${list.length === 1 ? "plan" : "plans"}`}</p>

      {list.length ? (
        <div className="rt-acc__card rt-biz__tablecard">
          <table className="rt-biz__table rt-adm-table rt-pws-pkgs">
            <thead>
              <tr>
                <th scope="col">Plan title</th>
                {pw.tiers.map((t) => <th scope="col" key={t.key}>{t.label}</th>)}
                <th scope="col">Archive</th>
                <th scope="col"><span className="rt-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const used = usedBy(p.id);
                return (
                  <tr key={p.id}>
                    <td data-label="Plan title">
                      <button type="button" className="rt-pws-pkgs__name" onClick={() => setEditor({ open: true, id: p.id })}>{p.name || "Untitled plan"}</button>
                      <small className="rt-adm-muted">{used.length ? `Used on ${used.map((c) => c.title || "Untitled course").join(", ")}` : "Not used on a course yet"}</small>
                    </td>
                    {pw.tiers.map((t) => <td key={t.key} data-label={t.label} className="rt-pws-money__num">{formatPrice(p.tiers[t.key]?.price || 0)}</td>)}
                    <td data-label="Archive">
                      <Toggle id={`rt-pkg-arc-${p.id}`} checked={!p.active} label={<span className="rt-sr">Archive {p.name}</span>} onChange={(on) => { setPackageActive(p.id, !on); say(on ? `${p.name} archived` : `${p.name} is active again`); }} />
                    </td>
                    <td data-label="Actions">
                      <RowMenu label={`Actions for ${p.name || "this plan"}`} items={[
                        { label: "Edit", onClick: () => setEditor({ open: true, id: p.id }) },
                        { label: "Clone package", onClick: () => clone(p) },
                        { label: "Delete", onClick: () => setRemoving(p) },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rt-acc__card rt-acc__empty">
          <p>No plans match these filters.</p>
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={clear}>Clear filters</button>
        </div>
      )}
      <p className="rt-acc__note">Archived plans stay on the courses that use them, but can&apos;t be picked for other courses.</p>

      <PackageEditor open={editor.open} packageId={editor.id} onClose={() => setEditor((x) => ({ ...x, open: false }))} onSaved={() => say(editor.id ? "Package saved" : "Package created")} />
      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this plan?" confirmLabel="Delete plan"
        text={removing ? `${removing.name || "This plan"} and its perks will be deleted.` : ""}
        blocked={removing && usedBy(removing.id).length ? `${usedBy(removing.id).length === 1 ? "1 course still uses" : `${usedBy(removing.id).length} courses still use`} this plan. Choose another price on ${usedBy(removing.id).length === 1 ? "that course" : "those courses"} first, or archive the plan.` : ""}
        onConfirm={() => { if (deletePackage(removing.id) !== false) say("Plan deleted"); setRemoving(null); }} />
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
