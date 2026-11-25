"use client";

import React, { useRef, useState } from "react";
import { useSavedSnapshot } from "@/lib/unsavedChanges";
import { admin as A } from "@/data/admin";
import { focusFirstError } from "@/lib/focusFirstError";
import { errorsFrom } from "@/lib/useMe";
import TextArea from "@/components/forms/TextArea";
import { Req } from "./adminParts";
import { RowTools, SaveRow, describedBy, field, newRowId, useSave } from "./contentParts";

// Site content's parts that course pages share (API content.save, keys teamTraining and licenceFees): written once here, used by
// every shared course page that switches them on in its editor (Course guide: CourseGuideEditor.jsx), so they can't drift apart.

const copy = A.content;
const MAX_BENEFITS = 6;
const MAX_FEES = 20;

// ---- team training -------------------------------------------------------------------------------------------------------
export function TeamTrainingForm({ value, canEdit }) {
  const save = useSave("teamTraining");
  const c = copy.teamTraining;
  const [v, setV] = useState(() => ({ title: value.title, intro: value.intro || "", quoteTitle: value.quote?.title || "", quoteText: value.quote?.text || "", benefits: (value.benefits || []).map((b) => ({ ...b, id: newRowId() })) }));
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const markSaved = useSavedSnapshot(v);
  const ref = useRef(null);
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const setBenefit = (i, patch) => setV((x) => ({ ...x, benefits: x.benefits.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const move = (i, by) => setV((x) => {
    const next = [...x.benefits];
    const [b] = next.splice(i, 1);
    next.splice(i + by, 0, b);
    return { ...x, benefits: next };
  });

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setGeneral("");
    const found = {};
    if (v.title.trim().length < 2) found.title = "Enter the heading.";
    if (v.quoteTitle.trim().length < 2) found.quoteTitle = "Enter the box heading.";
    v.benefits.forEach((b, i) => {
      if (b.title.trim().length < 2) found[`bt${i}`] = "Enter the benefit, or remove it.";
      if (b.text.trim().length < 2) found[`bx${i}`] = "Enter a line about it, or remove the benefit.";
    });
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    setSaving(true);
    try {
      await save({ title: v.title.trim(), intro: v.intro.trim(), benefits: v.benefits.map((b) => ({ title: b.title.trim(), text: b.text.trim() })), quote: { title: v.quoteTitle.trim(), text: v.quoteText.trim() } });
      setSaved(true);
      markSaved();
    } catch (err) {
      setGeneral(errorsFrom(err).general || Object.values(errorsFrom(err).fields)[0] || "");
    }
    setSaving(false);
  };

  return (
    <form className="rt-acc__stack" onSubmit={submit} noValidate ref={ref}>
      <div className="rt-acc__card">
        <h2 className="rt-acc__h2">{c.title}</h2>
        <p className="rt-acc__note">{c.note}</p>
        <p className="rt-acc__notice -warn rt-adm-mt">{c.legal}</p>
        {field("rt-adm-tt-title", <>{c.heading}<Req /></>, "", errors.title, (
          <input id="rt-adm-tt-title" type="text" maxLength={120} value={v.title} readOnly={!canEdit} onChange={set("title")} aria-invalid={errors.title ? true : undefined} aria-describedby={describedBy("rt-adm-tt-title", "", errors.title)} />
        ))}
        {field("rt-adm-tt-intro", c.intro, "", errors.intro, (
          <TextArea id="rt-adm-tt-intro" rows={3} maxLength={800} value={v.intro} readOnly={!canEdit} onChange={set("intro")} aria-describedby={describedBy("rt-adm-tt-intro", "", errors.intro)} />
        ))}
      </div>
      <p className="rt-acc__note rt-adm-help"><b>{c.benefits}.</b> {c.benefitsNote}</p>
      {v.benefits.map((b, i) => (
        <section key={b.id} className="rt-acc__card" aria-labelledby={`rt-adm-tt-b${b.id}`}>
          <div className="rt-acc__cardhead">
            <h2 className="rt-acc__h2" id={`rt-adm-tt-b${b.id}`}>{c.benefit.replace("{n}", i + 1)}</h2>
            {canEdit && <RowTools what={b.title || c.benefit.replace("{n}", i + 1)} first={i === 0} last={i === v.benefits.length - 1} onUp={() => move(i, -1)} onDown={() => move(i, 1)} onRemove={() => setV((x) => ({ ...x, benefits: x.benefits.filter((_, j) => j !== i) }))} />}
          </div>
          <div className="rt-adm-fees__grid">
            {field(`rt-adm-tt-bt${i}`, <>{c.benefitTitle}<Req /></>, "", errors[`bt${i}`], (
              <input id={`rt-adm-tt-bt${i}`} type="text" maxLength={60} value={b.title} readOnly={!canEdit} onChange={(e) => setBenefit(i, { title: e.target.value })} aria-invalid={errors[`bt${i}`] ? true : undefined} aria-describedby={describedBy(`rt-adm-tt-bt${i}`, "", errors[`bt${i}`])} />
            ))}
            {field(`rt-adm-tt-bx${i}`, <>{c.benefitText}<Req /></>, "", errors[`bx${i}`], (
              <input id={`rt-adm-tt-bx${i}`} type="text" maxLength={200} value={b.text} readOnly={!canEdit} onChange={(e) => setBenefit(i, { text: e.target.value })} aria-invalid={errors[`bx${i}`] ? true : undefined} aria-describedby={describedBy(`rt-adm-tt-bx${i}`, "", errors[`bx${i}`])} />
            ))}
          </div>
        </section>
      ))}
      {canEdit && (v.benefits.length < MAX_BENEFITS
        ? <button type="button" className="button -sm -outline-purple-1 text-purple-1 rt-adm-addrow" onClick={() => setV((x) => ({ ...x, benefits: [...x.benefits, { id: newRowId(), title: "", text: "" }] }))}>+ {c.addBenefit}</button>
        : <p className="rt-acc__note">{c.maxBenefits}</p>)}
      <div className="rt-acc__card">
        <h2 className="rt-acc__h2">{c.quote}</h2>
        <p className="rt-acc__note">{c.quoteNote}</p>
        <div className="rt-adm-fees__grid">
          {field("rt-adm-tt-qt", <>{c.quoteTitle}<Req /></>, "", errors.quoteTitle, (
            <input id="rt-adm-tt-qt" type="text" maxLength={60} value={v.quoteTitle} readOnly={!canEdit} onChange={set("quoteTitle")} aria-invalid={errors.quoteTitle ? true : undefined} aria-describedby={describedBy("rt-adm-tt-qt", "", errors.quoteTitle)} />
          ))}
          {field("rt-adm-tt-qx", c.quoteText, "", errors.quoteText, (
            <input id="rt-adm-tt-qx" type="text" maxLength={200} value={v.quoteText} readOnly={!canEdit} onChange={set("quoteText")} aria-describedby={describedBy("rt-adm-tt-qx", "", errors.quoteText)} />
          ))}
        </div>
      </div>
      <SaveRow canEdit={canEdit} saving={saving} error={general} saved={saved} />
    </form>
  );
}

// ---- licence fees --------------------------------------------------------------------------------------------------------
const KEY_RE = /^[a-z0-9-]{1,40}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const keyFrom = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export function LicenceFeesForm({ value, canEdit }) {
  const save = useSave("licenceFees");
  const c = copy.licenceFees;
  // a fee saved before keeps its short name (course pages' cost tables point at it); a new one gets one from its name
  const [rows, setRows] = useState(() => value.items.map((f) => ({ id: newRowId(), key: f.key, fixed: true, name: f.name, amount: String(f.amount), checked: f.checked })));
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const markSaved = useSavedSnapshot(rows);
  const ref = useRef(null);
  const edit = (i, patch) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setGeneral("");
    const found = {};
    const out = rows.map((r, i) => {
      const key = r.fixed ? r.key : keyFrom(r.name);
      if (r.name.trim().length < 2) found[`n${i}`] = "Enter the licence's name.";
      else if (!KEY_RE.test(key)) found[`n${i}`] = "Use letters or numbers in the name.";
      if (!/^\d{1,4}(\.\d{1,2})?$/.test(r.amount.trim()) || Number(r.amount) > 5000) found[`a${i}`] = "Enter the fee in pounds, like 204 or 204.50.";
      if (!DAY_RE.test(r.checked) || Number.isNaN(Date.parse(r.checked))) found[`c${i}`] = "Enter the day you checked it, like 2026-04-01.";
      return { key, name: r.name.trim(), amount: Number(r.amount), checked: r.checked };
    });
    out.forEach((x, i) => { if (!found[`n${i}`] && out.findIndex((y) => y.key === x.key) !== i) found[`n${i}`] = "Two fees have the same name. Give this one another."; });
    if (!rows.length) setGeneral("Keep at least one fee.");
    setErrors(found);
    if (Object.keys(found).length || !rows.length) return focusFirstError(ref.current);
    setSaving(true);
    try {
      await save({ items: out });
      setRows((r) => r.map((x, i) => ({ ...x, key: out[i].key, fixed: true })));
      setSaved(true);
      markSaved();
    } catch (err) {
      setGeneral(errorsFrom(err).general || Object.values(errorsFrom(err).fields)[0] || "");
    }
    setSaving(false);
  };

  return (
    <form className="rt-acc__stack" onSubmit={submit} noValidate ref={ref}>
      <div className="rt-acc__card">
        <h2 className="rt-acc__h2">{c.title}</h2>
        <p className="rt-acc__note">{c.note}</p>
      </div>
      {rows.map((r, i) => (
        <section key={r.id} className="rt-acc__card" aria-labelledby={`rt-adm-lf-${r.id}`}>
          <div className="rt-acc__cardhead">
            <h2 className="rt-acc__h2" id={`rt-adm-lf-${r.id}`}>{r.name.trim() || c.fee.replace("{n}", i + 1)}</h2>
            {canEdit && rows.length > 1 && <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>{c.remove}<span className="rt-sr">: {r.name}</span></button>}
          </div>
          {r.fixed && canEdit && rows.length > 1 && <p className="rt-acc__note">{c.removeNote}</p>}
          <div className="rt-adm-fees__grid">
            {field(`rt-adm-lf-n${i}`, <>{c.name}<Req /></>, c.nameHint, errors[`n${i}`], (
              <input id={`rt-adm-lf-n${i}`} type="text" maxLength={80} value={r.name} readOnly={!canEdit} onChange={(e) => edit(i, { name: e.target.value })} aria-invalid={errors[`n${i}`] ? true : undefined} aria-describedby={describedBy(`rt-adm-lf-n${i}`, c.nameHint, errors[`n${i}`])} />
            ))}
            {field(`rt-adm-lf-a${i}`, <>{c.amount}<Req /></>, "", errors[`a${i}`], (
              <input id={`rt-adm-lf-a${i}`} type="text" inputMode="decimal" className="rt-adm-num" value={r.amount} readOnly={!canEdit} onChange={(e) => edit(i, { amount: e.target.value.replace(/[^0-9.]/g, "") })} aria-invalid={errors[`a${i}`] ? true : undefined} aria-describedby={describedBy(`rt-adm-lf-a${i}`, "", errors[`a${i}`])} />
            ))}
            {field(`rt-adm-lf-c${i}`, <>{c.checked}<Req /></>, c.checkedHint, errors[`c${i}`], (
              <input id={`rt-adm-lf-c${i}`} type="date" value={r.checked} readOnly={!canEdit} onChange={(e) => edit(i, { checked: e.target.value })} aria-invalid={errors[`c${i}`] ? true : undefined} aria-describedby={describedBy(`rt-adm-lf-c${i}`, c.checkedHint, errors[`c${i}`])} />
            ))}
          </div>
        </section>
      ))}
      {canEdit && (rows.length < MAX_FEES
        ? <button type="button" className="button -sm -outline-purple-1 text-purple-1 rt-adm-addrow" onClick={() => setRows((x) => [...x, { id: newRowId(), key: "", fixed: false, name: "", amount: "", checked: "" }])}>+ {c.add}</button>
        : <p className="rt-acc__note">{c.max}</p>)}
      <SaveRow canEdit={canEdit} saving={saving} error={general} saved={saved} />
    </form>
  );
}
