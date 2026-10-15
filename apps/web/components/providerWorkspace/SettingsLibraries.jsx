"use client";

import React, { useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { focusFirstError } from "@/lib/focusFirstError";
import { deleteFaq, saveFaq } from "@/lib/providerWorkspace";
import { Empty, Search } from "./providerParts";
import { Confirm, Field, aria, useParam } from "./settingsForm";

// Settings › FAQs: the provider's reusable answers. A list with search (kept in the address), an add / edit panel (several at
// once when adding), and delete, which is blocked while a course still uses the answer.

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
