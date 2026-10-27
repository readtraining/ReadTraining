"use client";

import React, { Suspense, useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { saveOrg, useProvider } from "@/lib/providerWorkspace";
import { Choice, Loading } from "./providerParts";
import { useWorkspace } from "@/lib/workspaceContext";
import { Field, aria, isEmail } from "./settingsForm";
import { InfoTab, LogoTab, TermsTab, VenuesTab } from "./SettingsProfile";
import { QaTab } from "./SettingsPeople";

// Provider settings (/provider/settings?tab=…): Hurak's provider information, company logo, terms, VAT, affiliate, emails, QA and
// integrations, plus our venues. A second-level menu (a card list beside the tab from 992px, a chip row that scrolls sideways below)
// and the chosen tab. Information, logo, terms and venues use the API (SettingsProfile.jsx); VAT, emails, QA (SettingsPeople.jsx)
// and integrations are still DEMO records. Every save shows a toast.

const TABS = pw.settingsTabs;
const TAB_TEXT = {
  info: "What learners see about you on your public profile and on every course page.",
  logo: "Shown on your public profile, course pages and certificates.",
  terms: "Your cancellation policy and booking terms. Learners see them before they pay.",
  venues: "The places you run classroom courses. Each classroom date picks one.",
  vat: "If you are VAT registered, your number shows on learners' receipts.",
  affiliate: "Share this link. Bookings made through it count as yours.",
  emails: "Where we send refund requests, card disputes and new orders.",
  qa: "Questions learners ask about your courses, and ones you answer up front.",
  integrations: "Connect the tools you use to run courses.",
};
const PANELS = { info: InfoTab, logo: LogoTab, terms: TermsTab, venues: VenuesTab, vat: VatTab, affiliate: AffiliateTab, emails: EmailsTab, qa: QaTab, integrations: IntegrationsTab };
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

function AffiliateTab({ say }) {
  const slug = useWorkspace()?.slug || "";
  const [url, setUrl] = useState("");
  React.useEffect(() => setUrl(`${window.location.origin}/providers/${slug}?ref=${slug}`), [slug]);
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
