"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { businessAccount } from "@/data/businessAccount";
import { AUTH_ROUTES } from "@/lib/routes";
import { api } from "@/lib/trpc/react";
import { errorsFrom, useMe } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { trackEvent } from "@/lib/analytics";

const c = businessAccount.create;

function validate(v) {
  const e = {};
  const company = v.companyName.trim();
  if (company.length < 2 || !/[\p{L}\p{N}]/u.test(company)) e.companyName = "Enter your company name.";
  else if (company.length > 100) e.companyName = "Your company name must be 100 characters or fewer.";
  if (v.jobTitle.trim().length < 2) e.jobTitle = "Enter your role, like Operations Manager.";
  else if (v.jobTitle.trim().length > 80) e.jobTitle = "Your role must be 80 characters or fewer.";
  const digits = v.phone.replace(/\D/g, "").length;
  if (!v.phone.trim()) e.phone = "Enter your phone number.";
  else if (!/^\+?[\d\s()-]+$/.test(v.phone.trim()) || digits < 10 || digits > 15) e.phone = "Enter a phone number, like 0161 496 0000.";
  return e;
}

// Create a business account (/business/create), as the client's "Create a Business Account" for someone already signed in:
// company name, your role and phone. It adds a business to this same login and opens the Business account. Someone who already
// has one goes straight to it. The API checks everything again and logs it.
export default function CreateBusiness() {
  const router = useRouter();
  const me = useMe();
  const utils = api.useUtils();
  const create = api.organisations.createBusiness.useMutation();
  const [v, setV] = useState({ companyName: "", jobTitle: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const existing = me.data?.identities.find((i) => i.kind === "business");

  useEffect(() => {
    if (me.data?.profile.phone) setV((x) => (x.phone ? x : { ...x, phone: me.data.profile.phone }));
  }, [me.data?.profile.phone]);
  useEffect(() => {
    if (existing) router.replace("/business");
  }, [existing, router]);

  const set = (k) => (e) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
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
      await create.mutateAsync({ companyName: v.companyName.trim(), jobTitle: v.jobTitle.trim(), phone: v.phone.trim() });
      trackEvent("business_account_created");
      await utils.me.get.invalidate();
      router.push("/business");
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      setErrors(fields);
      setGeneral(err?.data?.code === "CONFLICT" ? err.message : g);
      if (Object.keys(fields).length) requestAnimationFrame(() => focusFirstError(formRef.current));
      setBusy(false);
    }
  };

  if (me.isLoading || me.person === undefined || existing) return <div className="rt-acc__card rt-po__card"><p className="rt-po__wait">{c.loading}</p></div>;

  const field = (k, label, hint, props) => {
    const id = `rt-cb-${k}`;
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
    <form className="rt-acc__card rt-acc__form rt-po__card" onSubmit={submit} noValidate ref={formRef} aria-labelledby="rt-cb-h">
      <h2 className="rt-po__h2" id="rt-cb-h">{c.formTitle}</h2>
      <p className="rt-acc__note">{c.formLead}</p>
      {field("companyName", c.company, c.companyHint, { type: "text", autoComplete: "organization", maxLength: 120 })}
      {field("jobTitle", c.jobTitle, c.jobTitleHint, { type: "text", autoComplete: "organization-title", maxLength: 100 })}
      {field("phone", c.phone, c.phoneHint, { type: "tel", autoComplete: "tel" })}
      <p className="rt-acc__note">
        {c.terms.before} <Link href={AUTH_ROUTES.terms}>{c.terms.terms}</Link> {c.terms.and} <Link href={AUTH_ROUTES.privacy}>{c.terms.privacy}</Link>.
      </p>
      <div className="rt-acc__formfoot">
        <button type="submit" className="button -md -purple-1 text-white" disabled={busy} aria-busy={busy}>{busy ? c.sending : c.submit}</button>
        {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
      </div>
    </form>
  );
}
