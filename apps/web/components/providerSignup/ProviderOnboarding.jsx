"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { providerSignup } from "@/data/providerSignup";
import { api } from "@/lib/trpc/react";
import { errorsFrom, useMe } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { trackEvent } from "@/lib/analytics";

const o = providerSignup.onboarding;

function validate(v) {
  const e = {};
  const name = v.name.trim();
  if (name.length < 2 || !/[\p{L}\p{N}]/u.test(name)) e.name = "Enter your company or instructor name.";
  else if (name.length > 100) e.name = "Your company or instructor name must be 100 characters or fewer.";
  const digits = v.mobile.replace(/\D/g, "").length;
  if (!v.mobile.trim()) e.mobile = "Enter your mobile number.";
  else if (!/^\+?[\d\s()-]+$/.test(v.mobile.trim()) || digits < 10 || digits > 15) e.mobile = "Enter a phone number, like 07700 900 982.";
  if (!v.acceptTerms) e.acceptTerms = "Agree to the provider terms to continue.";
  return e;
}

// Provider onboarding (/provider/onboarding): the step after "Become a provider", as the client's site has it, with the
// brief's fields: company or instructor name, mobile number and the provider terms. It adds a provider to this same login
// (no second account), opens the new provider workspace, and the empty public profile exists from that moment. Someone who
// already has a provider goes straight to it. The API checks everything again and logs it.
export default function ProviderOnboarding() {
  const router = useRouter();
  const me = useMe();
  const utils = api.useUtils();
  const create = api.organisations.createProvider.useMutation();
  const [v, setV] = useState({ name: "", mobile: "", acceptTerms: false });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const existing = me.data?.identities.find((i) => i.kind === "provider");

  // the mobile number from the profile, if one is saved
  useEffect(() => {
    if (me.data?.profile.phone) setV((x) => (x.mobile ? x : { ...x, mobile: me.data.profile.phone }));
  }, [me.data?.profile.phone]);
  useEffect(() => {
    if (existing) router.replace("/provider");
  }, [existing, router]);

  const set = (k) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setV((x) => ({ ...x, [k]: value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: "" }));
  };
  const submit = async (e) => {
    e.preventDefault();
    setGeneral("");
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setBusy(true);
    try {
      await create.mutateAsync({ name: v.name.trim(), mobile: v.mobile.trim(), acceptTerms: true });
      trackEvent("provider_created");
      await utils.me.get.invalidate();
      router.push("/provider");
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      setErrors(fields);
      setGeneral(err?.data?.code === "CONFLICT" ? err.message : g);
      if (Object.keys(fields).length) requestAnimationFrame(() => focusFirstError(formRef.current));
      setBusy(false);
    }
  };

  if (me.isLoading || me.person === undefined || existing) return <div className="rt-acc__card rt-po__card"><p className="rt-po__wait">{o.loading}</p></div>;

  const field = (k, label, hint, props) => {
    const id = `rt-po-${k}`;
    const by = [`${id}-hint`, errors[k] && `${id}-e`].filter(Boolean).join(" ");
    return (
      <div className="rt-field">
        <label htmlFor={id}>{label}</label>
        <small className="rt-field__hint" id={`${id}-hint`}>{hint}</small>
        {errors[k] && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{errors[k]}</p>}
        <input id={id} value={v[k]} onChange={set(k)} aria-invalid={errors[k] ? true : undefined} aria-describedby={by} disabled={busy} {...props} />
      </div>
    );
  };

  return (
    <form className="rt-acc__card rt-acc__form rt-po__card" onSubmit={submit} noValidate ref={formRef} aria-labelledby="rt-po-h">
      <h2 className="rt-po__h2" id="rt-po-h">{o.formTitle}</h2>
      <p className="rt-acc__note">{o.formLead}</p>
      {field("name", o.name, o.nameHint, { type: "text", autoComplete: "organization", maxLength: 120 })}
      {field("mobile", o.mobile, o.mobileHint, { type: "tel", autoComplete: "tel" })}
      <div className="rt-field">
        {errors.acceptTerms && <p className="rt-q__err" id="rt-po-terms-e"><span className="rt-sr">Error: </span>{errors.acceptTerms}</p>}
        <label className="rt-po__check" htmlFor="rt-po-terms">
          <input id="rt-po-terms" type="checkbox" checked={v.acceptTerms} onChange={set("acceptTerms")} aria-invalid={errors.acceptTerms ? true : undefined} aria-describedby={errors.acceptTerms ? "rt-po-terms-e" : undefined} disabled={busy} />
          <span>
            {o.terms.before} <a href={o.terms.termsHref} target="_blank" rel="noopener">{o.terms.terms}</a> {o.terms.and} <a href={o.terms.privacyHref} target="_blank" rel="noopener">{o.terms.privacy}</a>.
          </span>
        </label>
      </div>
      <div className="rt-acc__formfoot">
        <button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={busy}>{busy ? o.sending : o.submit}</button>
        {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
      </div>
    </form>
  );
}
