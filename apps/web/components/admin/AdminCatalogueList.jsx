"use client";

import React, { useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Confirm } from "@/components/providerWorkspace/settingsForm";
import { ErrorState } from "@/components/states/States";
import { refreshCatalogueList } from "@/app/admin/actions";
import { admin as A } from "@/data/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { RowMenu, Said, TableSkeleton } from "./adminParts";
import { AdminStatus } from "./AdminStatus";

const copy = A.catalogue.list;
const RENAMEABLE = new Set(["category", "subcategory", "topic"]);

// Catalogue settings: the catalogue's one list (API admin.catalogue). Categories, each opening to its sub-categories and
// their topics; then delivery methods and levels. With the "catalogue" switch: add, rename (categories, sub-categories and
// topics; a method's or level's name is its web address), retire or restore, and move up or down. After every change the
// site's saved copy of the list is marked out of date, so the filters and menus show it within seconds.
export default function AdminCatalogueList() {
  const me = useAdminAccess();
  const canEdit = me?.permissions?.includes("catalogue");
  const utils = api.useUtils();
  const list = api.admin.catalogue.list.useQuery();
  const [sheet, setSheet] = useState(null); // { mode: "add" | "rename", kind, parent?, key?, name?, where? }
  const [said, setSaid] = useState("");
  const [problem, setProblem] = useState(""); // the last refusal, shown until the next change
  const [retiring, setRetiring] = useState(null); // the entry waiting for "Retire …?": { kind, key, name }
  const [deleting, setDeleting] = useState(null); // a retired entry waiting for "Delete …?": { kind, key, name }
  const setActive = api.admin.catalogue.setActive.useMutation();
  const remove = api.admin.catalogue.remove.useMutation();
  const move = api.admin.catalogue.move.useMutation();

  if (list.isLoading) return <TableSkeleton />;
  if (list.error) return <ErrorState onRetry={() => list.refetch()} />;
  const { categories, methods, levels } = list.data;

  const changed = async (what) => {
    setSaid(what);
    await utils.admin.catalogue.list.invalidate();
    await refreshCatalogueList();
  };
  // a refusal (like retiring an entry with live courses) stays on screen until the next change, as well as in the toast
  const run = async (fn, what) => {
    try {
      await fn();
      setProblem("");
      await changed(what);
    } catch (err) {
      const message = errorsFrom(err).general;
      setProblem(message);
      setSaid(message);
    }
  };
  const actions = (kind, row, siblings, extra = []) => {
    if (!canEdit) return null;
    const i = siblings.indexOf(row);
    return (
      <div className="rt-adm-cat__actions">
        <button type="button" className="rt-adm-cat__move" onClick={() => run(() => move.mutateAsync({ kind, key: row.key, direction: "up" }), copy.saved.move)} disabled={i === 0 || move.isPending} aria-label={`${copy.up}: ${row.name}`}><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
        <button type="button" className="rt-adm-cat__move" onClick={() => run(() => move.mutateAsync({ kind, key: row.key, direction: "down" }), copy.saved.move)} disabled={i === siblings.length - 1 || move.isPending} aria-label={`${copy.down}: ${row.name}`}><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
        <RowMenu
          label={`Actions for ${row.name}`}
          items={[
            ...extra,
            // on phones the arrows are hidden and moving is here instead
            ...(i > 0 ? [{ label: copy.up, onClick: () => run(() => move.mutateAsync({ kind, key: row.key, direction: "up" }), copy.saved.move), phone: true }] : []),
            ...(i < siblings.length - 1 ? [{ label: copy.down, onClick: () => run(() => move.mutateAsync({ kind, key: row.key, direction: "down" }), copy.saved.move), phone: true }] : []),
            ...(RENAMEABLE.has(kind) ? [{ label: copy.rename, onClick: () => setSheet({ mode: "rename", kind, key: row.key, name: row.name }) }] : []),
            row.active
              ? { label: copy.retire, danger: true, onClick: () => setRetiring({ kind, key: row.key, name: row.name, live: row.live }) }
              : { label: copy.restore, onClick: () => run(() => setActive.mutateAsync({ kind, key: row.key, active: true }), copy.saved.restore) },
            // a retired entry nothing uses can be deleted for good (the API refuses, saying where, if anything uses it)
            ...(!row.active ? [{ label: "Delete", danger: true, onClick: () => setDeleting({ kind, key: row.key, name: row.name }) }] : []),
          ]}
        />
      </div>
    );
  };
  const label = (row) => (
    <span className="rt-adm-cat__name">
      <span className="rt-adm-strong">{row.name}</span>
      {!row.active && <AdminStatus kind="catalogue" status="retired">{copy.retired}</AdminStatus>}
      <small>{row.slug}</small>
      {row.live > 0 && <small>{liveCourses(row.live)}</small>}
    </span>
  );
  const addButton = (kind, parent, where) => canEdit && (
    <button type="button" className="rt-cd__link rt-adm-cat__add" onClick={() => setSheet({ mode: "add", kind, parent, where })}>+ {copy.add[kind]}</button>
  );

  return (
    <div className="rt-acc__stack">
      <p className="rt-acc__note rt-adm-help">{copy.note} {copy.retireNote}</p>
      {!canEdit && <p className="rt-acc__notice">{copy.readOnly}</p>}
      <Said text={said} />
      {problem && <p className="rt-acc__notice -warn" role="alert">{problem}</p>}

      <section className="rt-acc__card" aria-labelledby="rt-adm-cat-h">
        <h2 className="rt-acc__h2" id="rt-adm-cat-h">{copy.sections.category}</h2>
        <ul className="rt-adm-cat">
          {categories.map((c) => (
            <li key={c.key} className={c.active ? undefined : "is-retired"}>
              <details className="rt-adm-cat__group">
                <summary>
                  {label(c)}
                  <small className="rt-adm-cat__count">{copy.subcategories.replace("{n}", c.subcategories.length)}</small>
                </summary>
                <ul className="rt-adm-cat -sub">
                  {c.subcategories.map((s) => (
                    <li key={s.key} className={s.active ? undefined : "is-retired"}>
                      <details className="rt-adm-cat__group">
                        <summary>
                          {label(s)}
                          <small className="rt-adm-cat__count">{copy.topics.replace("{n}", s.topics.length)}</small>
                        </summary>
                        <ul className="rt-adm-cat -sub">
                          {s.topics.map((t) => (
                            <li key={t.key} className={t.active ? undefined : "is-retired"}>
                              <div className="rt-adm-cat__row">{label(t)}{actions("topic", t, s.topics)}</div>
                            </li>
                          ))}
                          {!s.topics.length && <li className="rt-adm-muted">{copy.none}</li>}
                        </ul>
                        {addButton("topic", s.key, s.name)}
                      </details>
                      {actions("subcategory", s, c.subcategories)}
                    </li>
                  ))}
                  {!c.subcategories.length && <li className="rt-adm-muted">{copy.none}</li>}
                </ul>
                {addButton("subcategory", c.key, c.name)}
              </details>
              {actions("category", c, categories)}
            </li>
          ))}
        </ul>
        {addButton("category")}
      </section>

      <div className="rt-adm-grid2">
        {[["method", methods], ["level", levels]].map(([kind, rows]) => (
          <section key={kind} className="rt-acc__card" aria-labelledby={`rt-adm-cat-${kind}-h`}>
            <h2 className="rt-acc__h2" id={`rt-adm-cat-${kind}-h`}>{copy.sections[kind]}</h2>
            {kind === "method" && <p className="rt-acc__note">{copy.methodsNote}</p>}
            <ul className="rt-adm-cat">
              {rows.map((r) => (
                <li key={r.key} className={r.active ? undefined : "is-retired"}>
                  <div className="rt-adm-cat__row">{label(r)}{actions(kind, r, rows)}</div>
                </li>
              ))}
            </ul>
            {addButton(kind)}
            <p className="rt-acc__note">{copy.fixedName}</p>
          </section>
        ))}
      </div>

      <NameSheet sheet={sheet} onClose={() => setSheet(null)} onDone={changed} />
      {/* retiring takes an entry out of the menus, filters and the provider editor's choices: asked first (restoring isn't) */}
      <Confirm open={Boolean(deleting)} onClose={() => setDeleting(null)} title={deleting ? `Delete ${deleting.name}?` : ""} text={deleting ? `It is removed for good${deleting.kind === "category" ? ", with its sub-categories and topics" : deleting.kind === "subcategory" ? ", with its topics" : ""}. Only an entry nothing has used can be deleted: if a course, review, coupon or the site content uses it, you'll be told and it stays retired. This can't be undone.` : ""} confirmLabel="Delete" onConfirm={() => { const d = deleting; setDeleting(null); run(() => remove.mutateAsync({ kind: d.kind, key: d.key }), `${d.name} deleted`); }} />
      {/* an entry with live courses filed under it can't be retired (API setActive): the pop-up says so at once, with nothing to confirm */}
      <Confirm
        open={Boolean(retiring)}
        onClose={() => setRetiring(null)}
        title={retiring ? (retiring.live ? `${retiring.name} can't be retired` : `Retire ${retiring.name}?`) : ""}
        text={retiring?.live ? "" : "It leaves the site's menus and filters, and providers can't choose it for a course. Nothing is deleted: you can restore it later."}
        blocked={retiring?.live ? `${liveCourses(retiring.live)} ${retiring.live === 1 ? "is" : "are"} filed under it. Move ${retiring.live === 1 ? "it" : "them"} to another ${WORD[retiring.kind]}, or pause ${retiring.live === 1 ? "it" : "them"}, first. Nothing has been changed.` : undefined}
        confirmLabel="Retire"
        onConfirm={() => { const r = retiring; setRetiring(null); run(() => setActive.mutateAsync({ kind: r.kind, key: r.key, active: false }), copy.saved.retire); }}
      />
    </div>
  );
}

const WORD = { category: "category", subcategory: "sub-category", topic: "topic", method: "delivery method", level: "level" };
const liveCourses = (n) => `${n} live ${n === 1 ? "course" : "courses"}`;

// Add an entry (its name; the address is made from it) or rename one. Errors inline, focus on the field.
function NameSheet({ sheet, onClose, onDone }) {
  const add = api.admin.catalogue.add.useMutation();
  const rename = api.admin.catalogue.rename.useMutation();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(null);
  const ref = useRef(null);
  if (sheet !== opened) {
    setOpened(sheet);
    setName(sheet?.name ?? "");
    setError("");
  }
  const submit = async (e) => {
    e.preventDefault();
    const v = name.trim();
    if (v.length < 2) {
      setError("Enter a name of at least 2 characters.");
      return focusFirstError(ref.current);
    }
    try {
      if (sheet.mode === "add") await add.mutateAsync({ kind: sheet.kind, parent: sheet.parent, name: v });
      else await rename.mutateAsync({ kind: sheet.kind, key: sheet.key, name: v });
      await onDone(sheet.mode === "add" ? `${copy.saved.add}: ${v}` : `${copy.saved.rename}: ${v}`);
      onClose();
    } catch (err) {
      const { fields, general } = errorsFrom(err);
      setError(fields.name || general);
      focusFirstError(ref.current);
    }
  };
  const title = sheet ? (sheet.mode === "add" ? copy.add[sheet.kind] : `${copy.rename}: ${sheet.name}`) : "";
  return (
    <Sheet open={Boolean(sheet)} onClose={onClose} title={title} closeLabel="Close">
      {sheet && (
        <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate ref={ref}>
          {sheet.where && <p className="rt-acc__note">In <strong>{sheet.where}</strong></p>}
          <div className="rt-field">
            <label htmlFor="rt-adm-cat-name">{copy.name}</label>
            <small className="rt-field__hint" id="rt-adm-cat-name-hint">{copy.addressHint}</small>
            {error && <p className="rt-q__err" id="rt-adm-cat-name-e"><span className="rt-sr">Error: </span>{error}</p>}
            <input id="rt-adm-cat-name" type="text" maxLength={60} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={`rt-adm-cat-name-hint${error ? " rt-adm-cat-name-e" : ""}`} />
          </div>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={add.isPending || rename.isPending}>{sheet.mode === "add" ? copy.add[sheet.kind] : copy.save}</button>
        </form>
      )}
    </Sheet>
  );
}
