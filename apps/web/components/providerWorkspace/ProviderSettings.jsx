"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Toast from "@/components/courses/Toast";
import { pw } from "@/data/providerWorkspace";
import { focusFirstError } from "@/lib/focusFirstError";
import { saveOrg, useProvider } from "@/lib/providerWorkspace";
import { Choice, Loading, DemoTag } from "./providerParts";
import { useWorkspace } from "@/lib/workspaceContext";
import { useProviderAccess } from "@/lib/providerAccess";
import { EmptyState, ErrorState } from "@/components/states/States";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import FormGate from "@/components/forms/FormGate";
import { Field, aria, isEmail } from "./settingsForm";
import { InfoTab, TermsTab } from "./SettingsProfile";
import { QaTab } from "./SettingsPeople";
import { FaqsTab } from "./SettingsFaqs";
import { useUnsavedChanges } from "@/lib/unsavedChanges";
import { Confirm } from "./settingsForm";

// Provider settings (/provider/settings?tab=…): provider information (with the logo), terms, FAQs, VAT, affiliate, emails,
// Q&A (learners' questions) and integrations. A second-level menu (a card list beside the tab from 992px, a chip row that scrolls sideways below) and the
// chosen tab, each tab for the roles that may open it. Information and logo, terms, FAQs, VAT and emails use the API; venues have their own page (/provider/venues); Q&A and
// integrations are still DEMO records, so they show the "coming soon" panel (NOT_SAVED). Every save shows a toast.

const TAB_TEXT = {
  info: "What learners see about you on your public profile and on every course page.",
  terms: "Your cancellation policy and booking terms. Learners see them before they pay.",
  faqs: "Questions learners ask about booking and training with you, with your answers.",
  vat: "If you are VAT registered, your number shows on learners' receipts.",
  affiliate: "Share this link. Bookings made through it count as yours.",
  emails: "Where we send refund requests, card disputes and new orders.",
  qa: "Questions learners ask about your courses, and ones you answer up front.",
  integrations: "Connect the tools you use to run courses.",
};
// a tab that works only in part (DemoTag beside the tab's heading); the tabs that don't save yet show "coming soon" (NOT_SAVED)
const DEMO_TABS = { affiliate: "This link works, but bookings made through it aren't counted yet: that comes with booking." };
const PANELS = { info: InfoTab, terms: TermsTab, faqs: FaqsTab, vat: VatTab, affiliate: AffiliateTab, emails: EmailsTab, qa: QaTab, integrations: IntegrationsTab };
const hrefFor = (key) => `/provider/settings?tab=${key}`;
// the tabs that would only save in this browser: behind the "coming soon" switch (lib/forms.js) until they save through the API
const NOT_SAVED = new Set(["qa", "integrations"]);

export default function ProviderSettings() {
  const { can } = useProviderAccess();
  // the accounts role opens Settings for the VAT and Emails tabs only
  if (!can("provider.settings.view") && !can("provider.vat.view") && !can("provider.emails.view")) return <EmptyState title="Settings aren't part of your role" text="Ask your provider's owner or an admin if something here needs changing." />;
  return (
    <Suspense fallback={<Loading rows={2} />}>
      <Settings />
    </Suspense>
  );
}

// the tabs this role opens: VAT for owner, admins and accounts; the rest with the settings switch
const tabNeeds = (key) => ({ vat: "provider.vat.view", emails: "provider.emails.view" })[key] ?? "provider.settings.view";

function Settings() {
  const { can } = useProviderAccess();
  const TABS = pw.settingsTabs.filter((t) => can(tabNeeds(t.key)));
  const data = useProvider();
  const sp = useSearchParams();
  const [toast, setToast] = useState(null);
  const say = useCallback((message, extra = {}) => setToast({ message, ...extra }), []);
  const clear = useCallback(() => setToast(null), []);
  const router = useRouter();
  const asked = sp.get("tab");
  // Venues moved to their own page: an old Settings › Venues link opens it
  useEffect(() => { if (asked === "venues") router.replace("/provider/venues"); }, [asked, router]);
  const tab = TABS.some((t) => t.key === asked) ? asked : TABS[0].key;
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
          <div className="rt-adm__titlerow">
            <h2 className="rt-acc__h2" id="rt-set-h">{label}</h2>
            {DEMO_TABS[tab] && <DemoTag note={DEMO_TABS[tab]} />}
          </div>
          <p className="rt-acc__note">{TAB_TEXT[tab]}</p>
        </div>
        {NOT_SAVED.has(tab) ? <FormGate form="providerSettings"><Panel key={tab} data={data} say={say} /></FormGate> : data ? <Panel key={tab} data={data} say={say} /> : <Loading rows={2} />}
      </section>
      <Toast toast={toast} onDone={clear} />
    </div>
  );
}

// ---- VAT -------------------------------------------------------------------------------------------------------------------

// registered or not, and the number when registered (API provider.profile.vat / saveVat: GB then 9 numbers, saved without spaces)
function VatTab({ say }) {
  const { organisationId } = useProviderAccess();
  const utils = api.useUtils();
  const saved = api.provider.profile.vat.useQuery({ organisationId });
  const save = api.provider.profile.saveVat.useMutation();
  const [reg, setReg] = useState(null);
  const [num, setNum] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef(null);
  useEffect(() => {
    if (!saved.data || reg !== null) return;
    setReg(saved.data.registered ? "yes" : "no");
    setNum(saved.data.number);
  }, [saved.data, reg]);
  const tidy = num.replace(/\s+/g, "").toUpperCase();
  useUnsavedChanges(Boolean(saved.data) && reg !== null && ((reg === "yes") !== saved.data.registered || (reg === "yes" && tidy !== saved.data.number)));
  if (saved.isError) return <ErrorState inCard onRetry={() => saved.refetch()} />;
  if (!saved.data || reg === null) return <Loading rows={2} />;
  const submit = async (e) => {
    e.preventDefault();
    if (reg === "yes" && !/^GB\d{9}$/.test(tidy)) {
      setError("Enter your VAT number: GB then 9 numbers, like GB 123 4567 89.");
      return focusFirstError(formRef.current);
    }
    setError("");
    try {
      const r = await save.mutateAsync({ organisationId, registered: reg === "yes", number: reg === "yes" ? tidy : undefined });
      utils.provider.profile.vat.setData({ organisationId }, r);
      setNum(r.number);
      say("Saved");
    } catch (err) {
      const { fields, general } = errorsFrom(err);
      setError(fields.number || general || "We couldn't save it. Check your connection, then try again.");
      focusFirstError(formRef.current);
    }
  };
  return (
    <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
      <Choice name="rt-set-vatreg" legend="Are you VAT registered?" value={reg} onChange={(v) => { setReg(v); setError(""); }} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
      {reg === "yes" && (
        <Field required id="rt-set-vat" label="VAT number" error={error} hint="GB then 9 numbers.">
          <input {...aria("rt-set-vat", error, true)} type="text" autoComplete="off" spellCheck={false} maxLength={16} value={num} onChange={(e) => { setNum(e.target.value); setError(""); }} className="rt-pws-set__short" />
        </Field>
      )}
      {reg === "no" && error && <p className="rt-q__err" role="alert">{error}</p>}
      <div className="rt-pws-set__foot">
        <p className="rt-acc__note">The prices you set are the prices learners pay. If you are registered, they include VAT.</p>
        <button type="submit" className="button -md -purple-1 text-white" disabled={save.isPending} aria-busy={save.isPending || undefined}>{save.isPending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

// ---- emails ----------------------------------------------------------------------------------------------------------------

const EMAILS = [
  { key: "refund", label: "Refund email", hint: "The email address where you want to get course refund requests." },
  { key: "dispute", label: "Dispute email", hint: "The email address where you want to get card disputes." },
  { key: "order", label: "Order email", hint: "The email address where you want to get new course orders." },
];
// where order, refund and dispute notices go (API provider.profile.emails / saveEmails); all three required
function EmailsTab({ say }) {
  const { organisationId, can } = useProviderAccess();
  const utils = api.useUtils();
  const saved = api.provider.profile.emails.useQuery({ organisationId });
  const save = api.provider.profile.saveEmails.useMutation();
  const locked = !can("provider.emails.edit");
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  useEffect(() => {
    if (saved.data && f === null) setF({ order: saved.data.order, refund: saved.data.refund, dispute: saved.data.dispute });
  }, [saved.data, f]);
  useUnsavedChanges(!locked && Boolean(saved.data && f) && EMAILS.some((m) => f[m.key].trim().toLowerCase() !== saved.data[m.key]));
  if (saved.isError) return <ErrorState inCard onRetry={() => saved.refetch()} />;
  if (!saved.data || !f) return <Loading rows={2} />;
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    EMAILS.forEach((m) => {
      if (!f[m.key].trim()) errs[m.key] = "Enter an email address.";
      else if (!isEmail(f[m.key].trim())) errs[m.key] = "Enter an email address, like bookings@yourcompany.co.uk.";
    });
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    try {
      const r = await save.mutateAsync({ organisationId, order: f.order.trim(), refund: f.refund.trim(), dispute: f.dispute.trim() });
      utils.provider.profile.emails.setData({ organisationId }, r);
      setF(r);
      say("Saved");
    } catch (err) {
      const { fields, general } = errorsFrom(err);
      setErrors(Object.keys(fields).length ? fields : { order: general || "We couldn't save them. Check your connection, then try again." });
      focusFirstError(formRef.current);
    }
  };
  return (
    <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
      {EMAILS.map((m) => (
        <Field required key={m.key} id={`rt-set-em-${m.key}`} label={m.label} hint={m.hint} error={errors[m.key]}>
          <input {...aria(`rt-set-em-${m.key}`, errors[m.key], true)} type="email" autoComplete="off" spellCheck={false} maxLength={254} className="rt-pws-set__mid" value={f[m.key]} disabled={locked} onChange={(e) => { setF((x) => ({ ...x, [m.key]: e.target.value })); setErrors((x) => ({ ...x, [m.key]: "" })); }} />
        </Field>
      ))}
      {!locked && (
        <div className="rt-pws-set__foot">
          <span></span>
          <button type="submit" className="button -md -purple-1 text-white" disabled={save.isPending} aria-busy={save.isPending || undefined}>{save.isPending ? "Saving…" : "Save"}</button>
        </div>
      )}
    </form>
  );
}

// ---- affiliate -------------------------------------------------------------------------------------------------------------

function AffiliateTab({ say }) {
  const workspace = useWorkspace();
  const slug = workspace?.slug || "";
  const live = workspace?.status === "active"; // the public profile opens once the account is approved
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
        {!live && <p className="rt-field__hint">This link opens once your account is approved.</p>}
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
  const [asking, setAsking] = useState(false); // "Disconnect Zoom?" is open
  const toggle = () => {
    setAsking(false);
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
      <button type="button" className={`button -md ${on ? "-outline-purple-1 text-purple-1" : "-purple-1 text-white"}`} onClick={on ? () => setAsking(true) : toggle} aria-haspopup={on ? "dialog" : undefined}>{on ? "Disconnect" : "Connect with Zoom"}</button>
      <Confirm danger open={asking} onClose={() => setAsking(false)} title="Disconnect Zoom?" text="New live online cohorts won't get a Zoom room, and you add their joining links yourself. Rooms already made stay as they are. You can connect again at any time." confirmLabel="Disconnect Zoom" onConfirm={toggle} />
    </div>
  );
}
