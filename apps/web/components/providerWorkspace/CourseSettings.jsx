"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pw } from "@/data/providerWorkspace";
import { canChangeFormat, canDeleteCourse, deleteCourse, duplicateCourse, saveCourseSettings, useProvider } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { formatPrice } from "@/lib/format";
import Sheet from "@/components/testPrep/runner/Sheet";
import Toast from "@/components/courses/Toast";
import { Choice, Loading, Toggle, getQuery, setQuery } from "./providerParts";

const PANELS = [
  { key: "options", title: "Ways to take the course", text: "Offer the course in more than one format." },
  { key: "records", title: "Learner records", text: "The details you record for each learner, like date of birth and result." },
  { key: "reschedule", title: "Date changes and resits", text: "Whether learners can move dates or resit the exam, and what it costs." },
  { key: "emails", title: "Booking confirmation", text: "The message learners get in their confirmation email." },
  { key: "seo", title: "Search engines", text: "How the course page shows in Google and other search results." },
  { key: "advanced", title: "Copy, marketplace and delete", text: "Duplicate the course, show or hide it on ReadTraining, or delete it." },
];
const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const FREE_PAID = [{ value: "free", label: "Free" }, { value: "paid", label: "Paid" }];
const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "your-course";

// What each card says about the current setting, so a provider sees the state without opening it.
function summary(key, st, course) {
  if (key === "options") return st.modes.length ? `Also ${st.modes.map((m) => pw.formats.find((f) => f.key === m)?.short.toLowerCase()).join(" and ")}` : `${pw.formats.find((f) => f.key === course.format)?.short} only`;
  if (key === "records") return st.clr.enabled ? `On: ${st.clr.fields.length + st.clr.custom.length} fields` : "Off";
  if (key === "reschedule") {
    const r = st.reschedule.enabled ? (st.reschedule.paid ? `Date changes ${formatPrice(st.reschedule.fee)}` : "Free date changes") : "No date changes";
    const x = st.resit.exam ? (st.resit.allowed ? (st.resit.paid ? `resits ${formatPrice(st.resit.price)}` : "free resits") : "no resits") : "no exam";
    return `${r}, ${x}`;
  }
  if (key === "emails") return st.confirmation ? "Your own message" : "Our standard message";
  if (key === "seo") return st.seo.title ? st.seo.title : "Not set: we use the course title";
  return st.marketplace ? "Shown on ReadTraining" : "Hidden from ReadTraining";
}

// The course's settings: a list of cards, each opening its own panel in place (kept in ?panel= so the back button works).
export default function CourseSettings({ course }) {
  const data = useProvider();
  const [panel, setPanel] = useState("");
  const [toast, setToast] = useState(null);
  const doneToast = useCallback(() => setToast(null), []);
  const listRef = useRef(null);

  useEffect(() => {
    const p = getQuery("panel");
    if (PANELS.some((x) => x.key === p)) setPanel(p);
  }, []);
  const open = (key) => {
    setPanel(key);
    setQuery("panel", key);
    window.scrollTo({ top: 0 });
  };
  const close = () => {
    const was = panel;
    setPanel("");
    setQuery("panel", "");
    requestAnimationFrame(() => listRef.current?.querySelector(`[data-panel="${was}"]`)?.focus());
  };
  const saved = (message, extra) => setToast({ message, ...extra });

  if (!data) return <Loading rows={2} />;
  const st = course.settings;
  const p = PANELS.find((x) => x.key === panel);

  return (
    <div className="rt-acc__stack rt-pws-cset">
      {p ? (
        <section className="rt-acc__card" aria-labelledby="rt-pws-cset-h">
          <button type="button" className="fb-textlink rt-pws-cset__back" onClick={close}><i className="icon-arrow-left text-12" aria-hidden="true"></i>Back to settings</button>
          <h2 className="rt-acc__h2" id="rt-pws-cset-h">{p.title}</h2>
          <p className="rt-acc__note rt-pws-cset__lead">{p.text}</p>
          {panel === "options" && <OptionsPanel course={course} locked={!canChangeFormat(data, course.id)} onSaved={saved} />}
          {panel === "records" && <RecordsPanel course={course} onSaved={saved} />}
          {panel === "reschedule" && <ReschedulePanel course={course} onSaved={saved} />}
          {panel === "emails" && <EmailPanel course={course} onSaved={saved} />}
          {panel === "seo" && <SeoPanel course={course} onSaved={saved} />}
          {panel === "advanced" && <AdvancedPanel course={course} deletable={canDeleteCourse(data, course.id)} onSaved={saved} />}
        </section>
      ) : (
        <ul className="rt-pws-cset__list" ref={listRef}>
          {PANELS.map((x) => (
            <li key={x.key}>
              <button type="button" className="rt-acc__card rt-pws-cset__card" data-panel={x.key} onClick={() => open(x.key)}>
                <span className="rt-pws-cset__cardtext">
                  <b>{x.title}</b>
                  <span>{x.text}</span>
                  <small>{summary(x.key, st, course)}</small>
                </span>
                <i className="icon-chevron-right text-12" aria-hidden="true"></i>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Toast toast={toast} onDone={doneToast} />
    </div>
  );
}

const Err = ({ id, text }) => (text ? <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{text}</p> : null);
const ariaFor = (id, text) => (text ? { "aria-invalid": true, "aria-describedby": `${id}-e` } : {});

// a. More ways to take the course. Locked once the course has orders, as on Hurak.
function OptionsPanel({ course, locked, onSaved }) {
  const [on, setOn] = useState(course.settings.modes.length > 0);
  const [modes, setModes] = useState(course.settings.modes);
  const [error, setError] = useState("");
  const ref = useRef(null);
  const others = pw.formats.filter((f) => f.key !== course.format);
  const submit = (e) => {
    e.preventDefault();
    if (on && !modes.length) {
      setError("Choose at least one more way to take the course, or turn this off.");
      return focusFirstError(ref.current);
    }
    setError("");
    saveCourseSettings(course.id, "modes", on ? modes : []);
    onSaved("Ways to take the course saved");
  };
  return (
    <form className="rt-q__form" onSubmit={submit} noValidate ref={ref}>
      {locked && <p className="rt-adm-item__block">This course has orders, so the ways to take it can't change. Create a new course for another format.</p>}
      <p className="rt-acc__note">Main format: <b>{pw.formats.find((f) => f.key === course.format)?.label}</b>.</p>
      <Toggle id="rt-pws-cset-modes" checked={on} onChange={setOn} disabled={locked} label="Offer more ways to take this course" />
      {on && (
        <fieldset className="rt-field rt-pws-cset__formats" aria-describedby={error ? "rt-pws-cset-fm-e" : undefined}>
          <legend className="rt-sr">Other formats</legend>
          <Err id="rt-pws-cset-fm" text={error} />
          {others.map((f) => {
            const checked = modes.includes(f.key);
            return (
              <label key={f.key} className={`rt-pws-cset__format${checked ? " is-on" : ""}`}>
                <input type="checkbox" className="rt-fp__check" checked={checked} disabled={locked} onChange={() => setModes(checked ? modes.filter((m) => m !== f.key) : [...modes, f.key])} />
                <i className={`${f.icon} text-20`} aria-hidden="true"></i>
                <span><b>{f.label}</b><small>{f.text}</small></span>
              </label>
            );
          })}
        </fieldset>
      )}
      <div><button type="submit" className="button -md -purple-1 text-white" disabled={locked}>Save</button></div>
    </form>
  );
}

// b. Cohort learner records: which details the tutor fills in for each learner.
function RecordsPanel({ course, onSaved }) {
  const clr = course.settings.clr;
  const [enabled, setEnabled] = useState(clr.enabled ? "yes" : "no");
  const [fields, setFields] = useState(clr.fields);
  const [custom, setCustom] = useState(clr.custom);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  const addRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    if (enabled === "yes" && !fields.length && !custom.length) {
      setErrors({ fields: "Choose at least one detail to record, or turn records off." });
      return focusFirstError(ref.current);
    }
    setErrors({});
    saveCourseSettings(course.id, "clr", { enabled: enabled === "yes", fields, custom });
    onSaved("Learner records saved");
  };
  const addField = (e) => {
    e.preventDefault();
    const n = name.trim();
    let error = "";
    if (!n) error = "Enter a name for the field.";
    else if ([...pw.clrFields.map((f) => f.label), ...custom].some((x) => x.toLowerCase() === n.toLowerCase())) error = "There is already a field with this name.";
    if (error) {
      setErrors({ name: error });
      return focusFirstError(addRef.current);
    }
    setCustom([...custom, n.slice(0, 60)]);
    setName("");
    setErrors({});
    setAdding(false);
  };

  return (
    <form className="rt-q__form" onSubmit={submit} noValidate ref={ref}>
      <Choice name="rt-pws-cset-clr" legend="Keep a record for each learner?" hint="Tutors fill these in on the cohort's register. They go on certificates and to awarding bodies." value={enabled} onChange={setEnabled} options={YES_NO} />
      {enabled === "yes" && (
        <fieldset className="rt-field rt-pws-cset__fields" aria-describedby={errors.fields ? "rt-pws-cset-fl-e" : undefined}>
          <legend>Details to record</legend>
          <Err id="rt-pws-cset-fl" text={errors.fields} />
          {pw.clrFields.map((f) => (
            <Toggle key={f.key} id={`rt-pws-cset-f-${f.key}`} checked={fields.includes(f.key)} onChange={(v) => setFields(v ? [...fields, f.key] : fields.filter((x) => x !== f.key))} label={f.label} />
          ))}
          {custom.length > 0 && (
            <ul className="rt-adm-list rt-pws-cset__custom">
              {custom.map((c) => (
                <li key={c}>
                  <span>{c}<small>Your own field</small></span>
                  <button type="button" className="rt-pws-cset__textbtn -danger" onClick={() => setCustom(custom.filter((x) => x !== c))}>Remove<span className="rt-sr"> {c}</span></button>
                </li>
              ))}
            </ul>
          )}
          <div><button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setName(""); setErrors({}); setAdding(true); }}>Add a field</button></div>
        </fieldset>
      )}
      <div><button type="submit" className="button -md -purple-1 text-white">Save</button></div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a field" closeLabel="Close">
        <div className="rt-q__form" ref={addRef}>
          <div className="rt-field">
            <label htmlFor="rt-pws-cset-fname">Field name</label>
            <small className="rt-field__hint">For example: Employer, Licence number or Shoe size for PPE.</small>
            <Err id="rt-pws-cset-fname" text={errors.name} />
            <input id="rt-pws-cset-fname" type="text" maxLength={60} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addField(e)} {...ariaFor("rt-pws-cset-fname", errors.name)} />
          </div>
          <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={addField}>Add field</button>
        </div>
      </Sheet>
    </form>
  );
}

// c. Date changes (reschedule) and exam resits, free or paid.
function ReschedulePanel({ course, onSaved }) {
  const { reschedule: r0, resit: x0 } = course.settings;
  const [r, setR] = useState({ enabled: r0.enabled, paid: r0.paid ? "paid" : "free", fee: r0.fee ? String(r0.fee) : "" });
  const [x, setX] = useState({ exam: x0.exam, allowed: x0.allowed ? "yes" : "no", paid: x0.paid ? "paid" : "free", title: x0.title, price: x0.price ? String(x0.price) : "" });
  const [errors, setErrors] = useState({});
  const ref = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (r.enabled && r.paid === "paid" && (!MONEY_RE.test(r.fee) || Number(r.fee) <= 0)) er.fee = "Enter the fee in pounds, like 20 or 19.50.";
    if (x.exam && x.allowed === "yes" && x.paid === "paid") {
      if (!x.title.trim()) er.title = "Enter the exam's name, like Practical reassessment.";
      if (!MONEY_RE.test(x.price) || Number(x.price) <= 0) er.price = "Enter the resit price in pounds, like 45.";
    }
    setErrors(er);
    if (Object.keys(er).length) return focusFirstError(ref.current);
    const rPaid = r.enabled && r.paid === "paid";
    const xPaid = x.exam && x.allowed === "yes" && x.paid === "paid";
    saveCourseSettings(course.id, "reschedule", { enabled: r.enabled, paid: rPaid, fee: rPaid ? Number(r.fee) : 0 });
    saveCourseSettings(course.id, "resit", { exam: x.exam, allowed: x.exam && x.allowed === "yes", paid: xPaid, title: xPaid ? x.title.trim() : "", price: xPaid ? Number(x.price) : 0 });
    onSaved("Date changes and resits saved");
  };

  return (
    <form className="rt-q__form" onSubmit={submit} noValidate ref={ref}>
      <div className="rt-pws-cset__group">
        <h3 className="rt-adm-h3">Date changes</h3>
        <Toggle id="rt-pws-cset-rs" checked={r.enabled} onChange={(v) => setR({ ...r, enabled: v })} label="Let learners move to another date" hint="For learners who can't make their date. They choose from your other upcoming dates." />
        {r.enabled && (
          <>
            <Choice name="rt-pws-cset-rspaid" legend="Charge for a date change?" value={r.paid} onChange={(v) => setR({ ...r, paid: v })} options={FREE_PAID} />
            {r.paid === "paid" && (
              <div className="rt-field">
                <label htmlFor="rt-pws-cset-fee">Fee (£)</label>
                <Err id="rt-pws-cset-fee" text={errors.fee} />
                <input id="rt-pws-cset-fee" className="rt-adm-num" type="text" inputMode="decimal" autoComplete="off" value={r.fee} onChange={(e) => setR({ ...r, fee: e.target.value.trim() })} {...ariaFor("rt-pws-cset-fee", errors.fee)} />
              </div>
            )}
          </>
        )}
      </div>
      <div className="rt-pws-cset__group">
        <h3 className="rt-adm-h3">Exams and resits</h3>
        <Toggle id="rt-pws-cset-exam" checked={x.exam} onChange={(v) => setX({ ...x, exam: v })} label="Learners sit an exam at the end" />
        {x.exam && (
          <>
            <Choice name="rt-pws-cset-resit" legend="If a learner fails, can they resit?" value={x.allowed} onChange={(v) => setX({ ...x, allowed: v })} options={YES_NO} />
            {x.allowed === "yes" && <Choice name="rt-pws-cset-resitpaid" legend="Charge for a resit?" value={x.paid} onChange={(v) => setX({ ...x, paid: v })} options={FREE_PAID} />}
            {x.allowed === "yes" && x.paid === "paid" && (
              <div className="rt-adm-fees__grid">
                <div className="rt-field">
                  <label htmlFor="rt-pws-cset-xtitle">Exam name</label>
                  <Err id="rt-pws-cset-xtitle" text={errors.title} />
                  <input id="rt-pws-cset-xtitle" type="text" maxLength={80} autoComplete="off" value={x.title} onChange={(e) => setX({ ...x, title: e.target.value })} {...ariaFor("rt-pws-cset-xtitle", errors.title)} />
                </div>
                <div className="rt-field">
                  <label htmlFor="rt-pws-cset-xprice">Resit price (£)</label>
                  <Err id="rt-pws-cset-xprice" text={errors.price} />
                  <input id="rt-pws-cset-xprice" className="rt-adm-num" type="text" inputMode="decimal" autoComplete="off" value={x.price} onChange={(e) => setX({ ...x, price: e.target.value.trim() })} {...ariaFor("rt-pws-cset-xprice", errors.price)} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div><button type="submit" className="button -md -purple-1 text-white">Save</button></div>
    </form>
  );
}

// d. The booking confirmation message, with a preview of how learners see it.
const MAX_MSG = 2000;
function EmailPanel({ course, onSaved }) {
  const [msg, setMsg] = useState(course.settings.confirmation || "");
  const submit = (e) => {
    e.preventDefault();
    saveCourseSettings(course.id, "confirmation", msg.trim());
    onSaved("Booking confirmation saved");
  };
  return (
    <form className="rt-q__form" onSubmit={submit} noValidate>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-msg">Message to learners</label>
        <small className="rt-field__hint" id="rt-pws-cset-msg-h">Shown in the confirmation email and in the learner's account. Add what to bring, parking or how to join. Leave it empty to use our standard message.</small>
        <textarea id="rt-pws-cset-msg" rows={7} maxLength={MAX_MSG} autoComplete="off" value={msg} onChange={(e) => setMsg(e.target.value)} aria-describedby="rt-pws-cset-msg-h rt-pws-cset-msg-c" />
        <small className="rt-field__hint rt-pws-cset__count" id="rt-pws-cset-msg-c">{msg.length} of {MAX_MSG} characters</small>
      </div>
      <div className="rt-pws-cset__preview" aria-label="Preview">
        <p className="rt-pws-cset__previewlabel">Preview</p>
        <p className="rt-pws-cset__previewtitle">Your booking is confirmed: {course.title || "your course"}</p>
        <p className="rt-pws-cset__previewbody">{msg.trim() || "Thank you for booking. Your joining instructions arrive before the course with the details you need."}</p>
      </div>
      <div><button type="submit" className="button -md -purple-1 text-white">Save</button></div>
    </form>
  );
}

// e. Search engine title, description and keywords, with a search result preview.
function SeoPanel({ course, onSaved }) {
  const seo = course.settings.seo;
  const [title, setTitle] = useState(seo.title);
  const [desc, setDesc] = useState(seo.description);
  const [keywords, setKeywords] = useState(seo.keywords);
  const [word, setWord] = useState("");
  const [errors, setErrors] = useState({});
  const ref = useRef(null);

  const addWords = (text) => {
    const add = text.split(",").map((w) => w.trim().toLowerCase().slice(0, 40)).filter((w) => w && !keywords.includes(w));
    if (add.length) setKeywords([...keywords, ...add].slice(0, 20));
    setWord("");
  };
  const submit = (e) => {
    e.preventDefault();
    const all = word.trim() ? [...keywords, ...word.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean)] : keywords;
    const er = {};
    if (!title.trim()) er.title = "Enter the title search engines show.";
    if (!desc.trim()) er.desc = "Enter the description search engines show.";
    if (!all.length) er.words = "Add at least one keyword, like first aid leeds.";
    setErrors(er);
    if (Object.keys(er).length) return focusFirstError(ref.current);
    setKeywords(all);
    setWord("");
    saveCourseSettings(course.id, "seo", { title: title.trim(), description: desc.trim(), keywords: [...new Set(all)].slice(0, 20) });
    onSaved("Search settings saved");
  };

  return (
    <form className="rt-q__form" onSubmit={submit} noValidate ref={ref}>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-st">Page title</label>
        <Err id="rt-pws-cset-st" text={errors.title} />
        <input id="rt-pws-cset-st" type="text" maxLength={60} autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={errors.title ? true : undefined} aria-describedby={`${errors.title ? "rt-pws-cset-st-e " : ""}rt-pws-cset-st-c`} />
        <small className="rt-field__hint rt-pws-cset__count" id="rt-pws-cset-st-c">{title.length} of 60 characters</small>
      </div>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-sd">Description</label>
        <Err id="rt-pws-cset-sd" text={errors.desc} />
        <textarea id="rt-pws-cset-sd" rows={4} maxLength={300} autoComplete="off" value={desc} onChange={(e) => setDesc(e.target.value)} aria-invalid={errors.desc ? true : undefined} aria-describedby={`${errors.desc ? "rt-pws-cset-sd-e " : ""}rt-pws-cset-sd-c`} />
        <small className="rt-field__hint rt-pws-cset__count" id="rt-pws-cset-sd-c">{desc.length} of 300 characters</small>
      </div>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-kw">Keywords</label>
        <small className="rt-field__hint" id="rt-pws-cset-kw-h">Press Enter or type a comma after each one. Up to 20.</small>
        <Err id="rt-pws-cset-kw" text={errors.words} />
        {keywords.length > 0 && (
          <ul className="rt-pws-cset__tags">
            {keywords.map((k) => (
              <li key={k}><span>{k}</span><button type="button" onClick={() => setKeywords(keywords.filter((x) => x !== k))} aria-label={`Remove keyword ${k}`}><i className="icon-close text-10" aria-hidden="true"></i></button></li>
            ))}
          </ul>
        )}
        <input id="rt-pws-cset-kw" type="text" maxLength={200} autoComplete="off" value={word}
          onChange={(e) => (e.target.value.includes(",") ? addWords(e.target.value) : setWord(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWords(word); } }}
          aria-invalid={errors.words ? true : undefined} aria-describedby={`${errors.words ? "rt-pws-cset-kw-e " : ""}rt-pws-cset-kw-h`} />
      </div>
      <div className="rt-pws-cset__serp" aria-label="Search result preview">
        <p className="rt-pws-cset__previewlabel">Search result preview</p>
        <span className="rt-pws-cset__serpurl">readtraining.co.uk › course › {slugify(course.title)}</span>
        <span className="rt-pws-cset__serptitle">{title.trim() || course.title || "Your course title"}</span>
        <span className="rt-pws-cset__serpdesc">{desc.trim() || course.subtitle || "Your description shows here."}</span>
      </div>
      <div><button type="submit" className="button -md -purple-1 text-white">Save</button></div>
    </form>
  );
}

// f. Duplicate, show on the ReadTraining marketplace, delete (only before anyone has booked).
function AdvancedPanel({ course, deletable, onSaved }) {
  const router = useRouter();
  const [market, setMarket] = useState(course.settings.marketplace ? "yes" : "no");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const duplicate = () => {
    const id = duplicateCourse(course.id);
    if (id) onSaved("Copy created as a draft", { href: `/provider/courses/${id}`, label: "Open the copy" });
  };
  const setMarketplace = (v) => {
    setMarket(v);
    saveCourseSettings(course.id, "marketplace", v === "yes");
    onSaved(v === "yes" ? "The course shows on ReadTraining" : "The course is hidden from ReadTraining");
  };
  const remove = () => {
    setBusy(true);
    if (deleteCourse(course.id)) router.push("/provider/courses");
    else setBusy(false);
  };

  return (
    <div className="rt-pws-cset__adv">
      <div className="rt-pws-cset__group">
        <h3 className="rt-adm-h3">Duplicate</h3>
        <p className="rt-acc__note">Make a draft copy of this course, with its description, pricing, curriculum and settings. Change the name and send it for review.</p>
        <div><button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={duplicate}>Duplicate course</button></div>
      </div>
      <div className="rt-pws-cset__group">
        <h3 className="rt-adm-h3">ReadTraining marketplace</h3>
        <Choice name="rt-pws-cset-market" legend="Show this course on ReadTraining?" hint="If you choose No, learners can still book through your own website and the orders you add." value={market} onChange={setMarketplace} options={YES_NO} />
      </div>
      <div className="rt-pws-cset__group">
        <h3 className="rt-adm-h3">Delete</h3>
        {deletable ? (
          <>
            <p className="rt-acc__note">Deletes the course and its dates for good. This can't be undone.</p>
            <div><button type="button" className="button -sm -outline-purple-1 text-purple-1 rt-adm-danger" onClick={() => setConfirm(true)}>Delete course</button></div>
          </>
        ) : (
          <p className="rt-adm-item__block">Courses can't be deleted after learners have booked. To stop new bookings, hide it from ReadTraining above or make it private in the course's details.</p>
        )}
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Delete this course?" closeLabel="Close">
        <div className="rt-q__form">
          <p className="rt-acc__note">“{course.title || "Untitled course"}” and its dates will be deleted for good.</p>
          <div className="rt-adm-cellrow">
            <button type="button" className="button -md -purple-1 text-white" onClick={remove} disabled={busy} aria-busy={busy || undefined}>{busy ? "Deleting…" : "Delete course"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setConfirm(false)}>Keep it</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
