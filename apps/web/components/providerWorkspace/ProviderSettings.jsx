"use client";

import React, { Suspense, useCallback, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { saveOrg, useProvider } from "@/lib/providerWorkspace";
import { Choice, Loading } from "./providerParts";
import { Counter, Field, aria, isEmail, isUrlOn } from "./settingsForm";
import { FaqsTab } from "./SettingsLibraries";
import { QaTab } from "./SettingsPeople";

// Provider settings (/provider/settings?tab=…), Hurak's nine: provider information, company logo, terms, VAT, affiliate, emails,
// FAQs, QA and integrations. A second-level menu (a card list beside the tab from 992px, a chip row that scrolls sideways below)
// and the chosen tab. FAQs are in SettingsLibraries.jsx, questions in SettingsPeople.jsx. Every save shows a toast.

const TABS = pw.settingsTabs;
const TAB_TEXT = {
  info: "What learners see about you on your public profile and on every course page.",
  logo: "Shown on your public profile, course pages and certificates.",
  terms: "Your policies and terms. Learners see them before they pay.",
  vat: "If you are VAT registered, your number shows on learners' receipts.",
  affiliate: "Share this link. Bookings made through it count as yours.",
  emails: "Where we send refund requests, card disputes and new orders.",
  faqs: "Questions and answers you can add to any course.",
  qa: "Questions learners ask about your courses, and ones you answer up front.",
  integrations: "Connect the tools you use to run courses.",
};
const PANELS = { info: InfoTab, logo: LogoTab, terms: TermsTab, vat: VatTab, affiliate: AffiliateTab, emails: EmailsTab, faqs: FaqsTab, qa: QaTab, integrations: IntegrationsTab };
const hrefFor = (key) => `/provider/settings?tab=${key}`;

export default function ProviderSettings() {
  return (
    <Suspense fallback={<Loading rows={2} />}>
      <Settings />
    </Suspense>
  );
}

function Settings() {
  const data = useProvider();
  const sp = useSearchParams();
  const [toast, setToast] = useState(null);
  const say = useCallback((message, extra = {}) => setToast({ message, ...extra }), []);
  const clear = useCallback(() => setToast(null), []);
  const asked = sp.get("tab");
  const tab = TABS.some((t) => t.key === asked) ? asked : "info";
  const label = TABS.find((t) => t.key === tab).label;
  const Panel = PANELS[tab];

  return (
    <div className="rt-pws-set">
      <nav className="rt-pws-set__nav" aria-label="Settings">
        <div className="rt-pws-set__navcard">
          <ul className="rt-acc__links">
            {TABS.map((t) => (
              <li key={t.key}>
                <Link href={hrefFor(t.key)} scroll={false} replace className={t.key === tab ? "is-active" : undefined} aria-current={t.key === tab ? "page" : undefined}>
                  <span>{t.label}</span>
                  {t.key === "qa" && data?.counts.questions > 0 && <span className="rt-adm__count" aria-label={`${data.counts.questions} to answer`}>{data.counts.questions}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <ul className="rt-acc__chips rt-pws-set__chips">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link href={hrefFor(t.key)} scroll={false} replace className={`rt-tr__filter${t.key === tab ? " is-on" : ""}`} aria-current={t.key === tab ? "page" : undefined}>{t.label}</Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="rt-pws-set__panel" aria-labelledby="rt-set-h">
        <div className="rt-pws-set__head">
          <h2 className="rt-acc__h2" id="rt-set-h">{label}</h2>
          <p className="rt-acc__note">{TAB_TEXT[tab]}</p>
        </div>
        {data ? <Panel key={tab} data={data} say={say} /> : <Loading rows={2} />}
      </section>
      <Toast toast={toast} onDone={clear} />
    </div>
  );
}

// ---- provider information --------------------------------------------------------------------------------------------------

const SOCIAL = [
  { key: "facebook", label: "Facebook", hosts: ["facebook.com"], example: "https://www.facebook.com/yourpage" },
  { key: "linkedin", label: "LinkedIn", hosts: ["linkedin.com"], example: "https://www.linkedin.com/company/yourcompany" },
  { key: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"], example: "https://www.youtube.com/@yourchannel" },
];

function InfoTab({ data, say }) {
  const o = data.org;
  const [f, setF] = useState({ name: o.name, headline: o.headline, bio: o.bio, facebook: o.facebook, linkedin: o.linkedin, youtube: o.youtube });
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = "Enter your training company's name.";
    if (!f.headline.trim()) errs.headline = "Enter a headline, like “First aid and fire training across West Yorkshire”.";
    if (!f.bio.trim()) errs.bio = "Write a short biography: who you are and where you train.";
    SOCIAL.forEach((x) => {
      if (f[x.key].trim() && !isUrlOn(f[x.key], x.hosts)) errs[x.key] = `Enter the full address of your ${x.label} page, like ${x.example}`;
    });
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    saveOrg({ name: f.name.trim(), headline: f.headline.trim(), bio: f.bio.trim(), facebook: f.facebook.trim(), linkedin: f.linkedin.trim(), youtube: f.youtube.trim() });
    say("Provider information saved");
  };

  return (
    <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
      <Field id="rt-set-name" label="Provider name" error={errors.name}>
        <input {...aria("rt-set-name", errors.name)} type="text" maxLength={80} autoComplete="organization" value={f.name} onChange={set("name")} />
      </Field>
      <Field id="rt-set-headline" label="Headline" error={errors.headline} count={<Counter value={f.headline} max={120} />}>
        <input {...aria("rt-set-headline", errors.headline)} type="text" maxLength={120} autoComplete="off" value={f.headline} onChange={set("headline")} />
      </Field>
      <Field id="rt-set-bio" label="Biography" hint="Who you are, where you train and what makes your courses good." error={errors.bio} count={<Counter value={f.bio} max={2000} />}>
        <textarea {...aria("rt-set-bio", errors.bio, true)} rows={6} maxLength={2000} autoComplete="off" value={f.bio} onChange={set("bio")} />
      </Field>
      <fieldset className="rt-pws-set__group">
        <legend>Social media (optional)</legend>
        <div className="rt-pws-set__grid">
          {SOCIAL.map((x) => (
            <Field key={x.key} id={`rt-set-${x.key}`} label={x.label} error={errors[x.key]}>
              <input {...aria(`rt-set-${x.key}`, errors[x.key])} type="url" inputMode="url" autoComplete="url" placeholder={x.example} value={f[x.key]} onChange={set(x.key)} />
            </Field>
          ))}
        </div>
      </fieldset>
      <div className="rt-pws-set__foot">
        <p className="rt-acc__note">Changes show on your public profile and course pages as soon as you save.</p>
        <button type="submit" className="button -md -purple-1 text-white">Save</button>
      </div>
    </form>
  );
}

// ---- company logo ----------------------------------------------------------------------------------------------------------

const LOGO_MAX = 2 * 1024 * 1024; // DEMO: kept in this browser until uploads go to the API
function LogoTab({ data, say }) {
  const [logo, setLogo] = useState(data.org.logo || "");
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const name = data.org.name;

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setError("Choose a PNG, JPG or WebP image.");
    if (file.size > LOGO_MAX) return setError("Choose an image smaller than 2 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new window.Image();
      img.onload = () => {
        if (img.width < 200 || img.height < 200) return setError("The logo must be at least 200 × 200 pixels.");
        if (img.width > 6000 || img.height > 6000) return setError("The logo must be at most 6000 × 6000 pixels.");
        setError("");
        setLogo(src);
      };
      img.onerror = () => setError("That image could not be read. Try another file.");
      img.src = src;
    };
    reader.readAsDataURL(file);
  };
  const save = () => {
    saveOrg({ logo });
    say(logo ? "Logo saved" : "Logo removed");
  };

  return (
    <div className="rt-acc__card rt-q__form rt-pws-set__form">
      {error && <p className="rt-q__err" id="rt-set-logo-e" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
      <div className="rt-pws-set__logo">
        <span className="rt-pws-set__logobox">
          {logo ? <Image src={logo} alt="Your logo" width={96} height={96} unoptimized /> : <span aria-hidden="true">{name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>}
        </span>
        <div className="rt-pws-set__logoside">
          <input ref={fileRef} id="rt-set-logo" type="file" accept="image/png,image/jpeg,image/webp" className="rt-sr" tabIndex={-1} aria-hidden="true" onChange={pick} />
          <div className="rt-pws-set__actions">
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => fileRef.current?.click()}>{logo ? "Change logo" : "Upload logo"}</button>
            {logo && <button type="button" className="rt-pws-set__textbtn" onClick={() => setLogo("")}>Remove logo</button>}
          </div>
          <p className="rt-field__hint">Minimum 200 × 200 pixels, maximum 6000 × 6000 pixels. PNG, JPG or WebP.</p>
        </div>
      </div>
      <div className="rt-pws-set__foot">
        <span></span>
        <button type="button" className="button -md -purple-1 text-white" onClick={save} disabled={logo === (data.org.logo || "")}>Save</button>
      </div>
    </div>
  );
}

// ---- terms -----------------------------------------------------------------------------------------------------------------

function TextDoc({ id, title, text, value, required, onSave, say, saved }) {
  const [v, setV] = useState(value || "");
  const [error, setError] = useState("");
  const formRef = useRef(null);
  const submit = (e) => {
    e.preventDefault();
    if (required && !v.trim()) {
      setError(`Enter your ${title.toLowerCase()}.`);
      return focusFirstError(formRef.current);
    }
    setError("");
    onSave(v.trim());
    say(saved);
  };
  return (
    <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
      <Field id={id} label={`${title}${required ? "" : " (optional)"}`} hint={text} error={error} count={<Counter value={v} max={5000} />}>
        <textarea {...aria(id, error, true)} rows={9} maxLength={5000} autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} />
      </Field>
      <div className="rt-pws-set__foot">
        <span></span>
        <button type="submit" className="button -md -outline-purple-1 text-purple-1">Save {title.toLowerCase()}</button>
      </div>
    </form>
  );
}

function TermsTab({ data, say }) {
  return (
    <div className="rt-acc__stack">
      <TextDoc id="rt-set-policy" title="Provider policies" required value={data.org.policy} say={say} saved="Policies saved"
        text="When learners can cancel or change dates, and what they get back. Learners see this before they pay, so keep it short and plain."
        onSave={(policy) => saveOrg({ policy })} />
      <TextDoc id="rt-set-terms" title="Terms of service" required value={data.org.terms} say={say} saved="Terms saved"
        text="Your own terms for learners, if you have them. They sit alongside ReadTraining's booking terms."
        onSave={(terms) => saveOrg({ terms })} />
    </div>
  );
}

// ---- VAT -------------------------------------------------------------------------------------------------------------------

const tidyVat = (v) => v.replace(/\s+/g, "").toUpperCase();
function VatTab({ data, say }) {
  const [reg, setReg] = useState(data.org.vat.registered ? "yes" : "no");
  const [num, setNum] = useState(data.org.vat.number || "");
  const [error, setError] = useState("");
  const formRef = useRef(null);
  const submit = (e) => {
    e.preventDefault();
    if (reg === "yes" && !/^GB\d{9}$/.test(tidyVat(num))) {
      setError("Enter your VAT number: GB then 9 numbers, like GB 123 4567 89.");
      return focusFirstError(formRef.current);
    }
    setError("");
    const n = tidyVat(num);
    saveOrg({ vat: reg === "yes" ? { registered: true, number: `${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 9)} ${n.slice(9)}` } : { registered: false, number: "" } });
    say("VAT details saved");
  };
  return (
    <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
      <Choice name="rt-set-vatreg" legend="Are you VAT registered?" value={reg} onChange={setReg} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
      {reg === "yes" && (
        <Field id="rt-set-vat" label="VAT number" error={error} hint="GB then 9 numbers.">
          <input {...aria("rt-set-vat", error, true)} type="text" autoComplete="off" spellCheck={false} maxLength={16} value={num} onChange={(e) => setNum(e.target.value)} className="rt-pws-set__short" />
        </Field>
      )}
      <div className="rt-pws-set__foot">
        <p className="rt-acc__note">The prices you set are the prices learners pay. If you are registered, they include VAT.</p>
        <button type="submit" className="button -md -purple-1 text-white">Save VAT details</button>
      </div>
    </form>
  );
}

// ---- emails ----------------------------------------------------------------------------------------------------------------

const EMAILS = [
  { key: "refund", label: "Refund email", hint: "We email this address when a learner asks for their money back." },
  { key: "dispute", label: "Dispute email", hint: "Disputes need your evidence within 7 days, so use an inbox someone checks daily." },
  { key: "order", label: "Order notification", hint: "A copy of every booking, with the learners' details." },
];
function EmailsTab({ data, say }) {
  const [f, setF] = useState({ ...data.org.emails });
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    EMAILS.forEach((m) => {
      if (!isEmail(f[m.key] || "")) errs[m.key] = "Enter an email address, like bookings@yourcompany.co.uk.";
    });
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    saveOrg({ emails: Object.fromEntries(EMAILS.map((m) => [m.key, f[m.key].trim()])) });
    say("Email addresses saved");
  };
  return (
    <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
      {EMAILS.map((m) => (
        <Field key={m.key} id={`rt-set-em-${m.key}`} label={m.label} hint={m.hint} error={errors[m.key]}>
          <input {...aria(`rt-set-em-${m.key}`, errors[m.key], true)} type="email" autoComplete="email" spellCheck={false} value={f[m.key] || ""} onChange={(e) => setF((x) => ({ ...x, [m.key]: e.target.value }))} />
        </Field>
      ))}
      <div className="rt-pws-set__foot">
        <span></span>
        <button type="submit" className="button -md -purple-1 text-white">Save email addresses</button>
      </div>
    </form>
  );
}

// ---- affiliate -------------------------------------------------------------------------------------------------------------

function AffiliateTab({ data, say }) {
  const url = `https://readtraining.co.uk/providers/${data.org.slug}?ref=${data.org.slug}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      say("Recommended URL copied");
    } catch {
      document.getElementById("rt-set-aff")?.select();
      say("Press Ctrl+C to copy the link");
    }
  };
  return (
    <div className="rt-acc__card rt-q__form rt-pws-set__form">
      <div className="rt-field">
        <label htmlFor="rt-set-aff">Recommended URL</label>
        <p className="rt-field__hint">Put it on your website, emails and social media. Learners who book through it count as your own customers, so no commission is taken.</p>
        <div className="rt-pws-course-addrow">
          <input id="rt-set-aff" value={url} readOnly onFocus={(e) => e.target.select()} />
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={copy}>Copy</button>
        </div>
      </div>
    </div>
  );
}

// ---- integrations ----------------------------------------------------------------------------------------------------------

function IntegrationsTab({ data, say }) {
  const on = Boolean(data.org.zoom);
  // DEMO: "Connect with Zoom" would send the provider to Zoom to approve access; here it only records the choice
  const toggle = () => {
    saveOrg({ zoom: !on });
    say(on ? "Zoom disconnected" : "Zoom connected");
  };
  return (
    <div className="rt-acc__card rt-pws-set__zoom">
      <span className="rt-pws-set__zoommark" aria-hidden="true"><i className="icon-play-button text-20"></i></span>
      <div>
        <h3 className="rt-pws-set__h3">Zoom</h3>
        <ul className="rt-pws-set__zoomlist">
          <li>Automatically create meeting rooms for your live online cohorts</li>
          <li>Record sessions and share them with learners</li>
          <li>See who joined each session</li>
        </ul>
        <p className="rt-acc__note">{on ? "Connected. New live online cohorts get a Zoom room." : "Not connected."}</p>
      </div>
      <button type="button" className={`button -md ${on ? "-outline-purple-1 text-purple-1" : "-purple-1 text-white"}`} onClick={toggle}>{on ? "Disconnect" : "Connect with Zoom"}</button>
    </div>
  );
}
