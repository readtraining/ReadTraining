"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pw } from "@/data/providerWorkspace";
import { canDeleteCourse, deleteCourse, saveCourse, saveCourseSettings, useProvider } from "@/lib/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import Sheet from "@/components/testPrep/runner/Sheet";
import { Choice, Toggle } from "./providerParts";

// The course editor's self-saving parts: Cohort learning records, Mode of study's exam resit, SEO settings, and the gear's
// course settings. Each has its own Save (or saves as you choose) and reports back through onSaved for the editor's toast.
const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const FREE_PAID = [{ value: "free", label: "Free" }, { value: "paid", label: "Paid" }];
const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "your-course";

const Err = ({ id, text }) => (text ? <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{text}</p> : null);
const ariaFor = (id, text) => (text ? { "aria-invalid": true, "aria-describedby": `${id}-e` } : {});

// Cohort learning records: the headings of a table the tutor fills in for each student on the cohort (Hurak's explainer).
export function RecordsPanel({ course, onSaved }) {
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
      setErrors({ fields: "Choose at least one heading, or choose No." });
      return focusFirstError(ref.current);
    }
    setErrors({});
    saveCourseSettings(course.id, "clr", { enabled: enabled === "yes", fields, custom });
    onSaved("Cohort learning records saved");
  };
  const addField = (e) => {
    e.preventDefault();
    const n = name.trim();
    let error = "";
    if (!n) error = "Enter the heading.";
    else if ([...pw.clrFields.map((f) => f.label), ...custom].some((x) => x.toLowerCase() === n.toLowerCase())) error = "There is already a heading with this name.";
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
      <Choice name="rt-pws-cset-clr" legend="Would you like to enable cohort learning records?" hint="Think of it as a table: here you create the headings, like Full name, Date of birth or Course result. You fill them in for each student on the cohort." value={enabled} onChange={setEnabled} options={YES_NO} />
      {enabled === "yes" && (
        <fieldset className="rt-field rt-pws-cset__fields" aria-describedby={errors.fields ? "rt-pws-cset-fl-e" : undefined}>
          <legend>Headings</legend>
          <Err id="rt-pws-cset-fl" text={errors.fields} />
          {pw.clrFields.map((f) => (
            <Toggle key={f.key} id={`rt-pws-cset-f-${f.key}`} checked={fields.includes(f.key)} onChange={(v) => setFields(v ? [...fields, f.key] : fields.filter((x) => x !== f.key))} label={f.label} />
          ))}
          {custom.length > 0 && (
            <ul className="rt-adm-list rt-pws-cset__custom">
              {custom.map((c) => (
                <li key={c}>
                  <span>{c}<small>Your own heading</small></span>
                  <button type="button" className="rt-pws-cset__textbtn -danger" onClick={() => setCustom(custom.filter((x) => x !== c))}>Remove<span className="rt-sr"> {c}</span></button>
                </li>
              ))}
            </ul>
          )}
          <div><button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => { setName(""); setErrors({}); setAdding(true); }}>Add a heading</button></div>
        </fieldset>
      )}
      <div><button type="submit" className="button -md -purple-1 text-white">Save</button></div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a heading" closeLabel="Close">
        <div className="rt-q__form" ref={addRef}>
          <div className="rt-field">
            <label htmlFor="rt-pws-cset-fname">Heading</label>
            <small className="rt-field__hint">For example: Employer, Licence number or Shoe size for PPE.</small>
            <Err id="rt-pws-cset-fname" text={errors.name} />
            <input id="rt-pws-cset-fname" type="text" maxLength={60} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addField(e)} {...ariaFor("rt-pws-cset-fname", errors.name)} />
          </div>
          <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={addField}>Add heading</button>
        </div>
      </Sheet>
    </form>
  );
}

// Mode of study › Exam resit: whether learners sit an exam, can resit it, and the resit's title and price (Hurak's exam resit form).
export function ResitPanel({ course, onSaved }) {
  const x0 = course.settings.resit;
  const [x, setX] = useState({ exam: x0.exam, allowed: x0.allowed ? "yes" : "no", paid: x0.paid ? "paid" : "free", title: x0.title, price: x0.price ? String(x0.price) : "" });
  const [errors, setErrors] = useState({});
  const ref = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (x.exam && x.allowed === "yes" && x.paid === "paid") {
      if (!x.title.trim()) er.title = "Enter the exam title, like Practical reassessment.";
      if (!MONEY_RE.test(x.price) || Number(x.price) <= 0) er.price = "Enter the exam price in pounds, like 45.";
    }
    setErrors(er);
    if (Object.keys(er).length) return focusFirstError(ref.current);
    const xPaid = x.exam && x.allowed === "yes" && x.paid === "paid";
    saveCourseSettings(course.id, "resit", { exam: x.exam, allowed: x.exam && x.allowed === "yes", paid: xPaid, title: xPaid ? x.title.trim() : "", price: xPaid ? Number(x.price) : 0 });
    onSaved("Exam resit saved");
  };

  return (
    <form className="rt-q__form" onSubmit={submit} noValidate ref={ref}>
      <Toggle id="rt-pws-cset-exam" checked={x.exam} onChange={(v) => setX({ ...x, exam: v })} label="Learners sit an exam at the end" />
      {x.exam && (
        <>
          <Choice name="rt-pws-cset-resit" legend="If a learner fails, can they resit?" value={x.allowed} onChange={(v) => setX({ ...x, allowed: v })} options={YES_NO} />
          {x.allowed === "yes" && <Choice name="rt-pws-cset-resitpaid" legend="Charge for a resit?" value={x.paid} onChange={(v) => setX({ ...x, paid: v })} options={FREE_PAID} />}
          {x.allowed === "yes" && x.paid === "paid" && (
            <div className="rt-adm-fees__grid">
              <div className="rt-field">
                <label htmlFor="rt-pws-cset-xtitle">Exam title</label>
                <Err id="rt-pws-cset-xtitle" text={errors.title} />
                <input id="rt-pws-cset-xtitle" type="text" maxLength={80} autoComplete="off" value={x.title} onChange={(e) => setX({ ...x, title: e.target.value })} {...ariaFor("rt-pws-cset-xtitle", errors.title)} />
              </div>
              <div className="rt-field">
                <label htmlFor="rt-pws-cset-xprice">Exam price (£)</label>
                <Err id="rt-pws-cset-xprice" text={errors.price} />
                <input id="rt-pws-cset-xprice" className="rt-adm-num" type="text" inputMode="decimal" autoComplete="off" value={x.price} onChange={(e) => setX({ ...x, price: e.target.value.trim() })} {...ariaFor("rt-pws-cset-xprice", errors.price)} />
              </div>
            </div>
          )}
        </>
      )}
      <div><button type="submit" className="button -md -purple-1 text-white">Save</button></div>
    </form>
  );
}

// SEO settings: title (60), description (320) and keywords, with a search result preview.
export function SeoPanel({ course, onSaved }) {
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
    if (!title.trim()) er.title = "Enter the SEO title.";
    if (!desc.trim()) er.desc = "Enter the SEO description.";
    setErrors(er);
    if (Object.keys(er).length) return focusFirstError(ref.current);
    setKeywords(all);
    setWord("");
    saveCourseSettings(course.id, "seo", { title: title.trim(), description: desc.trim(), keywords: [...new Set(all)].slice(0, 20) });
    onSaved("SEO settings saved");
  };

  return (
    <form className="rt-q__form" onSubmit={submit} noValidate ref={ref}>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-st">SEO title</label>
        <Err id="rt-pws-cset-st" text={errors.title} />
        <input id="rt-pws-cset-st" type="text" maxLength={60} autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={errors.title ? true : undefined} aria-describedby={`${errors.title ? "rt-pws-cset-st-e " : ""}rt-pws-cset-st-c`} />
        <small className="rt-field__hint rt-pws-cset__count" id="rt-pws-cset-st-c">{title.length} of 60 characters</small>
      </div>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-sd">SEO description</label>
        <Err id="rt-pws-cset-sd" text={errors.desc} />
        <textarea id="rt-pws-cset-sd" rows={4} maxLength={320} autoComplete="off" value={desc} onChange={(e) => setDesc(e.target.value)} aria-invalid={errors.desc ? true : undefined} aria-describedby={`${errors.desc ? "rt-pws-cset-sd-e " : ""}rt-pws-cset-sd-c`} />
        <small className="rt-field__hint rt-pws-cset__count" id="rt-pws-cset-sd-c">{desc.length} of 320 characters</small>
      </div>
      <div className="rt-field">
        <label htmlFor="rt-pws-cset-kw">Course keywords (optional)</label>
        <small className="rt-field__hint" id="rt-pws-cset-kw-h">Press Enter or type a comma after each one. Up to 20.</small>
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
          aria-describedby="rt-pws-cset-kw-h" />
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

// The gear on every editor page (Hurak's course settings): who can enrol (public or private), the recommended URL to share,
// the email that gets assignment submissions, the shared landing page (compliance courses), showing it on ReadTraining, and
// deleting it (only before anyone has booked). Each choice saves at once; the email saves with its button.
export function CourseGear({ course, open, onClose, onSaved }) {
  const data = useProvider();
  const router = useRouter();
  const [email, setEmail] = useState(course.settings.assignmentEmail || "");
  const [emailErr, setEmailErr] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = `https://readtraining.co.uk/course/${slugify(course.title)}?ref=${course.id.toLowerCase()}`;
  const deletable = data ? canDeleteCourse(data, course.id) : false;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      onSaved("Recommended URL copied");
    } catch {
      document.getElementById("rt-pws-gear-url")?.select();
      onSaved("Press Ctrl+C to copy the link");
    }
  };
  const saveEmail = (e) => {
    e.preventDefault();
    const v = email.trim();
    if (v && !EMAIL_RE.test(v)) {
      setEmailErr("Enter an email address in the correct format, like name@example.com.");
      return document.getElementById("rt-pws-gear-email")?.focus();
    }
    setEmailErr("");
    saveCourseSettings(course.id, "assignmentEmail", v);
    onSaved(v ? "Assignment email saved" : "Assignments go to your account email");
  };
  const remove = () => {
    setBusy(true);
    if (deleteCourse(course.id)) router.push("/provider/courses");
    else setBusy(false);
  };
  const close = () => {
    setConfirm(false);
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title={confirm ? "Delete this course?" : "Course settings"} closeLabel="Close">
      {confirm ? (
        <div className="rt-q__form">
          <p className="rt-acc__note">“{course.title || "Untitled course"}” and its dates will be deleted for good.</p>
          <div className="rt-adm-cellrow">
            <button type="button" className="button -md -purple-1 text-white" onClick={remove} disabled={busy} aria-busy={busy || undefined}>{busy ? "Deleting…" : "Delete course"}</button>
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setConfirm(false)}>Keep it</button>
          </div>
        </div>
      ) : (
        <div className="rt-q__form">
          <Choice name="rt-pws-gear-enrol" legend="Enrollment (privacy)" hint="Private courses don't show in search; you share the link or book learners yourself." value={course.enrolment} onChange={(v) => { saveCourse(course.id, { enrolment: v }); onSaved(v === "private" ? "The course is private" : "The course is public"); }} options={[{ value: "public", label: "Public" }, { value: "private", label: "Private" }]} />
          <div className="rt-field">
            <label htmlFor="rt-pws-gear-url">Recommended URL</label>
            <p className="rt-field__hint">Share it on your website or social media. Bookings through it count as yours.</p>
            <div className="rt-pws-course-addrow">
              <input id="rt-pws-gear-url" value={url} readOnly onFocus={(e) => e.target.select()} />
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={copy}>Copy</button>
            </div>
          </div>
          <form className="rt-field" onSubmit={saveEmail} noValidate>
            <label htmlFor="rt-pws-gear-email">Assignment email</label>
            <p className="rt-field__hint">Where we send learners&apos; assignment submissions. Leave it empty to use your account email.</p>
            {emailErr && <p className="rt-q__err" id="rt-pws-gear-email-e"><span className="rt-sr">Error: </span>{emailErr}</p>}
            <div className="rt-pws-course-addrow">
              <input id="rt-pws-gear-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" spellCheck={false} aria-invalid={emailErr ? true : undefined} aria-describedby={emailErr ? "rt-pws-gear-email-e" : undefined} />
              <button type="submit" className="button -sm -outline-purple-1 text-purple-1">Save</button>
            </div>
          </form>
          {course.type === "compliance" && (
            <label className="rt-fp__opt rt-pws-gear__check">
              <input type="checkbox" className="rt-fp__check" checked={course.sharedLanding} onChange={(e) => { saveCourse(course.id, { sharedLanding: e.target.checked }); onSaved(e.target.checked ? "Shown on the shared landing page" : "Removed from the shared landing page"); }} />
              <span>Advertise on our shared course landing page</span>
            </label>
          )}
          <Toggle id="rt-pws-gear-market" checked={course.settings.marketplace} onChange={(v) => { saveCourseSettings(course.id, "marketplace", v); onSaved(v ? "The course shows on ReadTraining" : "The course is hidden from ReadTraining"); }} label="Show this course on ReadTraining" hint="If it is off, learners can still book through your own website and the orders you add." />
          <div className="rt-pws-gear__danger">
            {deletable
              ? <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setConfirm(true)}>Delete course</button>
              : <p className="rt-acc__note">Courses can&apos;t be deleted after learners have booked. To stop new bookings, make it private or hide it from ReadTraining.</p>}
          </div>
        </div>
      )}
    </Sheet>
  );
}
