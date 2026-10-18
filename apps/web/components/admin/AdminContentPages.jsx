"use client";

import React, { useRef, useState } from "react";
import { admin as A } from "@/data/admin";
import { focusFirstError } from "@/lib/focusFirstError";
import { blocksToText, textToBlocks } from "@/lib/legalText";
import { errorsFrom } from "@/lib/useMe";
import { SaveRow, describedBy, field, newRowId, useSave } from "./contentParts";

const copy = A.content;

// Moves one item of a list a place up or down (the list as it is when nothing can move)
const moved = (list, i, by) => {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

// "Terms of use & more" into "terms-of-use-more": the web address of a section
const slugify = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";

// ---- one page's FAQ list -------------------------------------------------------------------------------------------------
// The questions and answers of one page (API content key "faq:<set>"): each with its question and answer, moved up or down,
// removed; "Add a question". Errors inline on the question or answer, focus on the first.
export function FaqForm({ contentKey, set, value, canEdit }) {
  const save = useSave(contentKey);
  const c = copy.faqs;
  const [items, setItems] = useState(() => value.items.map((x) => ({ id: newRowId(), q: x.q, a: x.a })));
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);
  const edit = (id, patch) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setGeneral("");
    const found = {};
    items.forEach((x, i) => {
      if (x.q.trim().length < 5) found[`q${i}`] = "Enter the question.";
      if (x.a.trim().length < 5) found[`a${i}`] = "Enter the answer.";
    });
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    setSaving(true);
    try {
      await save({ items: items.map((x) => ({ q: x.q.trim(), a: x.a.trim() })) });
      setSaved(true);
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      const mapped = {};
      for (const [k, v] of Object.entries(fields)) {
        const m = /^items\.(\d+)\.(q|a)$/.exec(k);
        if (m) mapped[`${m[2]}${m[1]}`] = v;
      }
      setErrors(mapped);
      setGeneral(Object.keys(mapped).length ? "" : g);
      if (Object.keys(mapped).length) focusFirstError(ref.current);
    }
    setSaving(false);
  };

  return (
    <form className="rt-acc__stack" onSubmit={submit} noValidate ref={ref}>
      {set.key.startsWith("course-page-") && <p className="rt-acc__note rt-adm-help">{c.town}</p>}
      {items.map((x, i) => (
        <section key={x.id} className="rt-acc__card" aria-labelledby={`rt-adm-fq-${x.id}`}>
          <div className="rt-acc__cardhead">
            <h2 className="rt-acc__h2" id={`rt-adm-fq-${x.id}`}>{c.itemTitle.replace("{n}", i + 1)}</h2>
            {canEdit && (
              <div className="rt-adm-content__rowtools">
                <button type="button" className="rt-cd__link" onClick={() => setItems((xs) => moved(xs, i, -1))} disabled={i === 0}>{c.up}<span className="rt-sr">: {c.itemTitle.replace("{n}", i + 1)}</span></button>
                <button type="button" className="rt-cd__link" onClick={() => setItems((xs) => moved(xs, i, 1))} disabled={i === items.length - 1}>{c.down}<span className="rt-sr">: {c.itemTitle.replace("{n}", i + 1)}</span></button>
                {items.length > 1 && <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setItems((xs) => xs.filter((y) => y.id !== x.id))}>{c.remove}<span className="rt-sr">: {c.itemTitle.replace("{n}", i + 1)}</span></button>}
              </div>
            )}
          </div>
          {field(`rt-adm-fqq-${x.id}`, c.question, "", errors[`q${i}`], <input id={`rt-adm-fqq-${x.id}`} type="text" maxLength={200} value={x.q} readOnly={!canEdit} onChange={(e) => edit(x.id, { q: e.target.value })} aria-invalid={errors[`q${i}`] ? true : undefined} aria-describedby={describedBy(`rt-adm-fqq-${x.id}`, "", errors[`q${i}`])} />)}
          {field(`rt-adm-fqa-${x.id}`, c.answer, "", errors[`a${i}`], <textarea id={`rt-adm-fqa-${x.id}`} rows={4} maxLength={3000} value={x.a} readOnly={!canEdit} onChange={(e) => edit(x.id, { a: e.target.value })} aria-invalid={errors[`a${i}`] ? true : undefined} aria-describedby={describedBy(`rt-adm-fqa-${x.id}`, "", errors[`a${i}`])} />)}
        </section>
      ))}
      {canEdit && (items.length < 30
        ? <button type="button" className="rt-cd__link" onClick={() => setItems((xs) => [...xs, { id: newRowId(), q: "", a: "" }])}>+ {c.add}</button>
        : <p className="rt-acc__note">{c.max}</p>)}
      <SaveRow canEdit={canEdit} saving={saving} error={general} saved={saved} />
    </form>
  );
}

// ---- a legal document ----------------------------------------------------------------------------------------------------
// One legal page (API content key "page:<slug>"): the introduction, the dates, whether it is shown as a draft, and its
// sections, each a heading and its text in the plain-text form of lib/legalText.js (paragraphs, bullet lists, tables).
export function LegalForm({ contentKey, doc, value, canEdit }) {
  const save = useSave(contentKey);
  const c = copy.legal;
  const [v, setV] = useState(() => ({ lead: value.lead ?? "", updated: value.updated, effective: value.effective, draft: Boolean(value.draft) }));
  const [sections, setSections] = useState(() => value.sections.map((s) => ({ rid: newRowId(), id: s.id, title: s.title, text: blocksToText(s.blocks) })));
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);
  const editSection = (rid, patch) => setSections((xs) => xs.map((x) => (x.rid === rid ? { ...x, ...patch } : x)));
  const today = new Date().toISOString().slice(0, 10);
  const hasBrackets = sections.some((s) => /\[[A-Za-z][^\]]*\](?!\()/.test(s.text));

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setGeneral("");
    const found = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.updated)) found.updated = "Enter the date.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.effective)) found.effective = "Enter the date.";
    const used = new Set();
    const out = sections.map((s, i) => {
      if (s.title.trim().length < 2) found[`title${i}`] = "Enter the heading.";
      const parsed = textToBlocks(s.text);
      if (parsed.error) found[`text${i}`] = parsed.error;
      else if (!parsed.blocks.length) found[`text${i}`] = "Enter the text.";
      // a section keeps its web address; a new one gets one made from its heading
      let id = s.id || slugify(s.title);
      for (let n = 2; used.has(id); n++) id = `${slugify(s.title)}-${n}`;
      used.add(id);
      return { id, title: s.title.trim(), blocks: parsed.blocks ?? [] };
    });
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    setSaving(true);
    try {
      await save({ lead: v.lead.trim(), updated: v.updated, effective: v.effective, draft: v.draft, sections: out });
      setSaved(true);
      setSections((xs) => xs.map((x, i) => ({ ...x, id: out[i].id })));
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      const mapped = {};
      for (const [k, msg] of Object.entries(fields)) {
        const m = /^sections\.(\d+)\.(title|blocks)/.exec(k);
        if (m) mapped[m[2] === "title" ? `title${m[1]}` : `text${m[1]}`] = msg;
        else mapped[k] = msg;
      }
      setErrors(mapped);
      setGeneral(Object.keys(mapped).length ? "" : g);
      if (Object.keys(mapped).length) focusFirstError(ref.current);
    }
    setSaving(false);
  };

  return (
    <form className="rt-acc__stack" onSubmit={submit} noValidate ref={ref}>
      <section className="rt-acc__card" aria-labelledby="rt-adm-lg-h">
        <h2 className="rt-acc__h2" id="rt-adm-lg-h">{doc.title}</h2>
        {field("rt-adm-lg-lead", c.lead, "", errors.lead, <textarea id="rt-adm-lg-lead" rows={2} maxLength={400} value={v.lead} readOnly={!canEdit} onChange={(e) => setV((x) => ({ ...x, lead: e.target.value }))} aria-invalid={errors.lead ? true : undefined} aria-describedby={describedBy("rt-adm-lg-lead", "", errors.lead)} />)}
        <div className="rt-adm-fees__grid">
          {field("rt-adm-lg-updated", c.updated, doc.key === "page:provider-terms" ? c.updatedHintProvider : c.updatedHint, errors.updated, (
            <div className="rt-adm-inline__row">
              <input id="rt-adm-lg-updated" type="date" value={v.updated} readOnly={!canEdit} onChange={(e) => setV((x) => ({ ...x, updated: e.target.value }))} aria-invalid={errors.updated ? true : undefined} aria-describedby={describedBy("rt-adm-lg-updated", "x", errors.updated)} className="rt-ck__short" />
              {canEdit && v.updated !== today && <button type="button" className="rt-cd__link" onClick={() => setV((x) => ({ ...x, updated: today, effective: x.effective < today ? today : x.effective }))}>Today</button>}
            </div>
          ))}
          {field("rt-adm-lg-effective", c.effective, "", errors.effective, <input id="rt-adm-lg-effective" type="date" value={v.effective} readOnly={!canEdit} onChange={(e) => setV((x) => ({ ...x, effective: e.target.value }))} aria-invalid={errors.effective ? true : undefined} aria-describedby={describedBy("rt-adm-lg-effective", "", errors.effective)} className="rt-ck__short" />)}
        </div>
        <label className="rt-bk__check rt-adm-mt" htmlFor="rt-adm-lg-draft">
          <input id="rt-adm-lg-draft" type="checkbox" checked={v.draft} disabled={!canEdit} onChange={(e) => setV((x) => ({ ...x, draft: e.target.checked }))} aria-describedby="rt-adm-lg-draft-hint" />
          <span>{c.draft}</span>
        </label>
        <p className="rt-acc__note" id="rt-adm-lg-draft-hint">{c.draftHint}</p>
        {hasBrackets && <p className="rt-acc__notice rt-adm-mt">{c.bracketNote}</p>}
      </section>

      {sections.map((s, i) => (
        <section key={s.rid} className="rt-acc__card" aria-labelledby={`rt-adm-ls-${s.rid}`}>
          <div className="rt-acc__cardhead">
            <h2 className="rt-acc__h2" id={`rt-adm-ls-${s.rid}`}>{c.sectionTitle.replace("{n}", i + 1)}</h2>
            {canEdit && (
              <div className="rt-adm-content__rowtools">
                <button type="button" className="rt-cd__link" onClick={() => setSections((xs) => moved(xs, i, -1))} disabled={i === 0}>{c.up}<span className="rt-sr">: {s.title}</span></button>
                <button type="button" className="rt-cd__link" onClick={() => setSections((xs) => moved(xs, i, 1))} disabled={i === sections.length - 1}>{c.down}<span className="rt-sr">: {s.title}</span></button>
                {sections.length > 1 && <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setSections((xs) => xs.filter((y) => y.rid !== s.rid))}>{c.removeSection}<span className="rt-sr">: {s.title}</span></button>}
              </div>
            )}
          </div>
          {field(`rt-adm-lst-${s.rid}`, c.heading, "", errors[`title${i}`], <input id={`rt-adm-lst-${s.rid}`} type="text" maxLength={120} value={s.title} readOnly={!canEdit} onChange={(e) => editSection(s.rid, { title: e.target.value })} aria-invalid={errors[`title${i}`] ? true : undefined} aria-describedby={describedBy(`rt-adm-lst-${s.rid}`, "", errors[`title${i}`])} />)}
          {field(`rt-adm-lsx-${s.rid}`, c.text, i === 0 ? c.textHint : "", errors[`text${i}`], <textarea id={`rt-adm-lsx-${s.rid}`} className="rt-adm-content__legal" rows={Math.min(18, Math.max(5, s.text.split("\n").length + 1))} value={s.text} readOnly={!canEdit} onChange={(e) => editSection(s.rid, { text: e.target.value })} aria-invalid={errors[`text${i}`] ? true : undefined} aria-describedby={describedBy(`rt-adm-lsx-${s.rid}`, i === 0 ? "x" : "", errors[`text${i}`])} />)}
        </section>
      ))}
      {canEdit && (sections.length < 60
        ? <button type="button" className="rt-cd__link" onClick={() => setSections((xs) => [...xs, { rid: newRowId(), id: "", title: "", text: "" }])}>+ {c.addSection}</button>
        : <p className="rt-acc__note">{c.maxSections}</p>)}
      <SaveRow canEdit={canEdit} saving={saving} error={general} saved={saved} />
    </form>
  );
}
