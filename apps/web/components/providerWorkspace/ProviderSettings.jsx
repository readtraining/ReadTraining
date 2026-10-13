"use client";

import React, { Suspense, useCallback, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { connectPayout, disconnectPayout, saveOrg, useProvider } from "@/lib/providerWorkspace";
import { Choice, Loading } from "./providerParts";
import { Confirm, Counter, Field, aria, isEmail, isUrlOn } from "./settingsForm";
import { FaqsTab, PricingTab, VenuesTab } from "./SettingsLibraries";
import { QaTab, TeamTab } from "./SettingsPeople";

// Settings (/provider/settings?tab=…): a second-level menu (a card list beside the tab from 992px, a chip row that scrolls
// sideways below) and the chosen tab. Profile, terms, VAT, emails and the payout account are here; the libraries (FAQs, venues,
// price packages) are in SettingsLibraries.jsx, questions and team in SettingsPeople.jsx. Every save shows a toast.

const TABS = pw.settingsTabs;
const TAB_TEXT = {
  profile: "What learners see about you on your public profile and on every course page.",
  terms: "Your own policy and terms. Learners see them before they pay.",
  vat: "If you are VAT registered, your number shows on learners' receipts.",
  emails: "Where we send refund requests, card disputes and new orders.",
  payouts: "The bank account we pay your course sales into.",
  faqs: "Questions and answers you can add to any course.",
  venues: "The places you run courses. Pick them on a course and on each cohort.",
  pricing: "Saver, Flexi and Premium options you can reuse on tiered courses.",
  qa: "Questions learners ask about your courses, and ones you answer up front.",
  team: "People who can use this workspace, and what each of them can do.",
};
const PANELS = { profile: ProfileTab, terms: TermsTab, vat: VatTab, emails: EmailsTab, payouts: PayoutsTab, faqs: FaqsTab, venues: VenuesTab, pricing: PricingTab, qa: QaTab, team: TeamTab };
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
  const tab = TABS.some((t) => t.key === asked) ? asked : "profile";
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
                  {t.key === "payouts" && data && !data.org.payout.connected && <span className="rt-pws-set__dot" aria-label="Not set up"></span>}
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

// ---- profile ---------------------------------------------------------------------------------------------------------------

const SOCIAL = [
  { key: "facebook", label: "Facebook page", hosts: ["facebook.com"], example: "https://www.facebook.com/yourpage" },
  { key: "linkedin", label: "LinkedIn page", hosts: ["linkedin.com"], example: "https://www.linkedin.com/company/yourcompany" },
  { key: "youtube", label: "YouTube channel", hosts: ["youtube.com", "youtu.be"], example: "https://www.youtube.com/@yourchannel" },
];
const LOGO_MAX = 1024 * 1024;

function ProfileTab({ data, say }) {
  const o = data.org;
  const [f, setF] = useState({ name: o.name, headline: o.headline, bio: o.bio, facebook: o.facebook, linkedin: o.linkedin, youtube: o.youtube, logo: o.logo || "" });
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const fileRef = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const pickLogo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) return setErrors((x) => ({ ...x, logo: "Choose a PNG, JPG, SVG or WebP image." }));
    if (file.size > LOGO_MAX) return setErrors((x) => ({ ...x, logo: "Choose an image smaller than 1 MB." }));
    const reader = new FileReader();
    reader.onload = () => {
      setF((x) => ({ ...x, logo: String(reader.result) }));
      setErrors((x) => ({ ...x, logo: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = "Enter your training company's name.";
    if (!f.headline.trim()) errs.headline = "Enter a headline, like “First aid and fire training across West Yorkshire”.";
    SOCIAL.forEach((s) => {
      if (f[s.key].trim() && !isUrlOn(f[s.key], s.hosts)) errs[s.key] = `Enter the full address of your ${s.label.toLowerCase()}, like ${s.example}`;
    });
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    saveOrg({ name: f.name.trim(), headline: f.headline.trim(), bio: f.bio.trim(), facebook: f.facebook.trim(), linkedin: f.linkedin.trim(), youtube: f.youtube.trim(), logo: f.logo });
    say("Profile saved");
  };

  return (
    <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
      <div className="rt-field">
        <span className="rt-pws-set__label" id="rt-set-logo-l">Logo (optional)</span>
        {errors.logo && <p className="rt-q__err" id="rt-set-logo-e"><span className="rt-sr">Error: </span>{errors.logo}</p>}
        <div className="rt-pws-set__logo">
          <span className="rt-pws-set__logobox">
            {f.logo ? <Image src={f.logo} alt="Your logo" width={72} height={72} unoptimized /> : <span aria-hidden="true">{f.name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>}
          </span>
          <div className="rt-pws-set__logoside">
            <input ref={fileRef} id="rt-set-logo" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="rt-sr" onChange={pickLogo} aria-labelledby="rt-set-logo-l" aria-describedby={errors.logo ? "rt-set-logo-e rt-set-logo-h" : "rt-set-logo-h"} />
            <div className="rt-pws-set__actions">
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => fileRef.current?.click()}>{f.logo ? "Change logo" : "Upload logo"}</button>
              {f.logo && <button type="button" className="rt-pws-set__textbtn" onClick={() => setF((x) => ({ ...x, logo: "" }))}>Remove logo</button>}
            </div>
            <p className="rt-field__hint" id="rt-set-logo-h">Square, at least 200 × 200 pixels, under 1 MB.</p>
          </div>
        </div>
      </div>
      <Field id="rt-set-name" label="Provider name" error={errors.name}>
        <input {...aria("rt-set-name", errors.name)} type="text" maxLength={80} autoComplete="organization" value={f.name} onChange={set("name")} />
      </Field>
      <Field id="rt-set-headline" label="Headline" error={errors.headline} count={<Counter value={f.headline} max={120} />}>
        <input {...aria("rt-set-headline", errors.headline)} type="text" maxLength={120} autoComplete="off" value={f.headline} onChange={set("headline")} />
      </Field>
      <Field id="rt-set-bio" label="About you (optional)" hint="Who you are, where you train and what makes your courses good." count={<Counter value={f.bio} max={2000} />}>
        <textarea {...aria("rt-set-bio", undefined, true)} rows={6} maxLength={2000} autoComplete="off" value={f.bio} onChange={set("bio")} />
      </Field>
      <fieldset className="rt-pws-set__group">
        <legend>Social media (optional)</legend>
        <div className="rt-pws-set__grid">
          {SOCIAL.map((s) => (
            <Field key={s.key} id={`rt-set-${s.key}`} label={s.label} error={errors[s.key]}>
              <input {...aria(`rt-set-${s.key}`, errors[s.key])} type="url" inputMode="url" autoComplete="url" placeholder={s.example} value={f[s.key]} onChange={set(s.key)} />
            </Field>
          ))}
        </div>
      </fieldset>
      <div className="rt-pws-set__foot">
        <p className="rt-acc__note">Changes show on your public profile and course pages as soon as you save.</p>
        <button type="submit" className="button -md -purple-1 text-white">Save profile</button>
      </div>
    </form>
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
      <TextDoc id="rt-set-policy" title="Booking and cancellation policy" required value={data.org.policy} say={say} saved="Policy saved"
        text="When learners can cancel or change dates, and what they get back. Learners see this before they pay, so keep it short and plain."
        onSave={(policy) => saveOrg({ policy })} />
      <TextDoc id="rt-set-terms" title="Terms of service" value={data.org.terms} say={say} saved="Terms saved"
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
  { key: "refund", label: "Refund requests", hint: "We email this address when a learner asks for their money back." },
  { key: "dispute", label: "Card disputes", hint: "Disputes need your evidence within 7 days, so use an inbox someone checks daily." },
  { key: "order", label: "New orders", hint: "A copy of every booking, with the learners' details." },
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

// ---- payout account --------------------------------------------------------------------------------------------------------

function PayoutsTab({ data, say }) {
  const p = data.org.payout;
  const [editing, setEditing] = useState(!p.connected);
  const [removing, setRemoving] = useState(false);
  const [f, setF] = useState({ holder: "", sort: "", account: "" });
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    const sort = f.sort.replace(/[\s-]/g, "");
    const account = f.account.replace(/\s/g, "");
    if (!f.holder.trim()) errs.holder = "Enter the name on the bank account.";
    if (!/^\d{6}$/.test(sort)) errs.sort = "Enter a sort code of 6 numbers, like 30-94-12.";
    if (!/^\d{8}$/.test(account)) errs.account = "Enter an account number of 8 numbers.";
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    // DEMO: the full details would go straight to the payment partner; we keep only the last 4 digits (lib/providerWorkspace.js)
    connectPayout({ holder: f.holder.trim(), sort, account });
    setF({ holder: "", sort: "", account: "" });
    setEditing(false);
    say("Payout account saved");
  };

  return (
    <div className="rt-acc__stack">
      {p.connected && !editing ? (
        <div className="rt-acc__card">
          <dl className="rt-adm-dl">
            <div><dt>Account holder</dt><dd>{p.holder}</dd></div>
            <div><dt>Sort code</dt><dd>{p.sort}</dd></div>
            <div><dt>Account number</dt><dd>Ending {p.last4}</dd></div>
          </dl>
          <div className="rt-pws-set__actions rt-adm-mt">
            <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditing(true)}>Change bank details</button>
            <button type="button" className="rt-pws-set__textbtn rt-adm-danger" onClick={() => setRemoving(true)}>Remove</button>
          </div>
        </div>
      ) : (
        <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
          {!p.connected && <p className="rt-adm-item__reason">Add a bank account so we can pay you for your bookings. Until then, your sales wait in your balance.</p>}
          <Field id="rt-set-holder" label="Name on the account" error={errors.holder}>
            <input {...aria("rt-set-holder", errors.holder)} type="text" autoComplete="name" value={f.holder} onChange={set("holder")} />
          </Field>
          <div className="rt-pws-set__grid -two">
            <Field id="rt-set-sort" label="Sort code" error={errors.sort} hint="6 numbers">
              <input {...aria("rt-set-sort", errors.sort, true)} type="text" inputMode="numeric" autoComplete="off" maxLength={8} value={f.sort} onChange={set("sort")}
                onBlur={() => { const d = f.sort.replace(/\D/g, ""); if (d.length === 6) setF((x) => ({ ...x, sort: d.replace(/(\d{2})(\d{2})(\d{2})/, "$1-$2-$3") })); }} />
            </Field>
            <Field id="rt-set-acc" label="Account number" error={errors.account} hint="8 numbers">
              <input {...aria("rt-set-acc", errors.account, true)} type="text" inputMode="numeric" autoComplete="off" maxLength={10} value={f.account} onChange={set("account")} />
            </Field>
          </div>
          <p className="rt-acc__note"><i className="icon-check text-12" aria-hidden="true"></i> Your full bank details go straight to our payment partner. We only keep the last 4 numbers to show you here.</p>
          <div className="rt-pws-set__actions">
            <button type="submit" className="button -md -purple-1 text-white">Save bank details</button>
            {p.connected && <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => { setEditing(false); setErrors({}); }}>Cancel</button>}
          </div>
        </form>
      )}

      <div className="rt-acc__card">
        <h3 className="rt-pws-set__h3">How you are paid</h3>
        <dl className="rt-adm-dl">
          <div><dt>ReadTraining marketplace sales</dt><dd>{pw.fee.commission}% commission, taken after the card fee and any refund</dd></div>
          <div><dt>Card payments</dt><dd>{pw.fee.card}% card fee on every card or payment-link order, kept if the order is refunded</dd></div>
          <div><dt>Your website and your own orders</dt><dd>No commission</dd></div>
        </dl>
        <Link href="/provider/payouts" className="fb-textlink rt-adm-mt">See your payouts<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
      </div>

      <Confirm open={removing} onClose={() => setRemoving(false)} title="Remove this bank account?" confirmLabel="Remove bank account"
        text="We can't pay you until you add another account. Sales keep building up in your balance."
        onConfirm={() => { disconnectPayout(); setRemoving(false); setEditing(true); say("Bank account removed"); }} />
    </div>
  );
}
