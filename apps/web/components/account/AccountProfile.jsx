"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { account } from "@/data/account";
import { api } from "@/lib/trpc/react";
import { errorsFrom, useMe } from "@/lib/useMe";
import { getSupabase } from "@/lib/supabase/client";
import { PHOTO_ACCEPT, squarePhoto } from "@/lib/photo";
import { validPostcode } from "@/lib/checkout";
import { focusFirstError } from "@/lib/focusFirstError";
import { ErrorState } from "@/components/states/States";

const copy = account.profile;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[\p{L}][\p{L}\p{M} '’.-]*$/u;
const today = () => new Date().toISOString().slice(0, 10);

// Account settings in Hurak's four parts, each saved on its own: basic information (photo, name, date of birth, phone, the
// "Verified" badge), address, email (needs the current password) and password (current, new, repeat). Then the marketing
// emails choice (consent can be withdrawn as easily as it was given) and how to close the account. Everything is read from
// and saved through the API (me.*), which checks it again and writes the activity log.
export default function AccountProfile() {
  const me = useMe();
  // while loading, and while a browser whose session ended is on its way to log in (useMe)
  if (me.isLoading || me.person === undefined || me.error?.data?.code === "UNAUTHORIZED") return <ProfileSkeleton />;
  if (me.error || !me.data) {
    return (
      <ErrorState title={copy.failed.title} text={copy.failed.text} onRetry={() => me.refetch()} />
    );
  }
  return (
    <div className="rt-acc__stack">
      <BasicSection me={me.data} />
      <AddressSection me={me.data} />
      <EmailSection me={me.data} />
      <PasswordSection me={me.data} />
      <MarketingSection me={me.data} />
      <section className="rt-acc__card" aria-labelledby="rt-pf-close-h">
        <h2 className="rt-acc__h3" id="rt-pf-close-h">{copy.delete.title}</h2>
        <p className="rt-acc__note">{copy.delete.text}</p>
        <Link href={copy.delete.cta.href} className="fb-textlink">{copy.delete.cta.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
      </section>
    </div>
  );
}

// ---- shared parts -----------------------------------------------------------------------------------------------------------

function Field({ id, label, error, hint, ...input }) {
  const by = [hint && `${id}-hint`, error && `${id}-e`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="rt-field">
      <label htmlFor={id}>{label}</label>
      {hint && <small className="rt-field__hint" id={`${id}-hint`}>{hint}</small>}
      {error && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{error}</p>}
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={by} {...input} />
    </div>
  );
}

// One saved-on-its-own form: its values, errors, status and the server call, with the first error focused.
function useSection(initial, mutation, check, toInput = (v) => v) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState(false); // the whole save: the server call and the refresh after it
  const formRef = useRef(null);
  const utils = api.useUtils();
  const set = (k) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [k]: value }));
    setSaved("");
    if (errors[k]) setErrors((x) => ({ ...x, [k]: "" }));
  };
  const submit = (onDone) => async (e) => {
    e.preventDefault();
    setGeneral("");
    setSaved("");
    const found = check(values);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setPending(true);
    try {
      const result = await mutation.mutateAsync(toInput(values));
      await utils.me.get.invalidate();
      setSaved(onDone ? onDone(result, setValues) || "" : copy.saved);
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      setErrors(fields);
      setGeneral(g);
      if (Object.keys(fields).length) requestAnimationFrame(() => focusFirstError(formRef.current));
    } finally {
      setPending(false);
    }
  };
  return { values, setValues, errors, general, saved, set, submit, formRef, busy: pending };
}

function Foot({ busy, label, saved, general, outline }) {
  return (
    <div className="rt-acc__formfoot">
      <button type="submit" className={outline ? "button -md -outline-purple-1 text-purple-1" : "button -md -purple-1 text-white"} disabled={busy} aria-busy={busy}>{busy ? copy.saving : label}</button>
      <p className="rt-acc__savedmsg" role="status">{saved}</p>
      {general && <p className="rt-q__err rt-acc__formerr" role="alert">{general}</p>}
    </div>
  );
}

// ---- basic information ----------------------------------------------------------------------------------------------------

function BasicSection({ me }) {
  const p = me.profile;
  const s = useSection(
    { firstName: p.firstName, lastName: p.lastName, dateOfBirth: p.dateOfBirth ?? "", phone: p.phone ?? "" },
    api.me.updateBasic.useMutation(),
    (v) => {
      const e = {};
      if (!v.firstName.trim()) e.firstName = "Enter your first name.";
      else if (v.firstName.trim().length > 50) e.firstName = "Your first name must be 50 characters or fewer.";
      else if (!NAME_RE.test(v.firstName.trim())) e.firstName = "Your first name can only use letters, spaces, hyphens and apostrophes.";
      if (!v.lastName.trim()) e.lastName = "Enter your last name.";
      else if (v.lastName.trim().length > 50) e.lastName = "Your last name must be 50 characters or fewer.";
      else if (!NAME_RE.test(v.lastName.trim())) e.lastName = "Your last name can only use letters, spaces, hyphens and apostrophes.";
      if (!v.dateOfBirth) e.dateOfBirth = "Enter your date of birth.";
      else if (v.dateOfBirth >= today() || v.dateOfBirth < "1900-01-01") e.dateOfBirth = "Enter a real date of birth in the past.";
      const digits = v.phone.replace(/\D/g, "").length;
      if (!v.phone.trim()) e.phone = "Enter your contact number.";
      else if (!/^\+?[\d\s()-]+$/.test(v.phone.trim()) || digits < 10 || digits > 15) e.phone = "Enter a phone number, like 07700 900 982.";
      return e;
    },
  );
  // the header and Supabase's emails read the name from the sign-in record, which the API updated: refresh this browser's copy
  const done = () => {
    getSupabase().auth.refreshSession().catch(() => {});
    return copy.saved;
  };
  return (
    <form className="rt-acc__card rt-acc__form" onSubmit={s.submit(done)} noValidate aria-labelledby="rt-pf-basic-h" ref={s.formRef}>
      <div className="rt-acc__cardhead">
        <h2 className="rt-acc__h2" id="rt-pf-basic-h">{copy.basic.title}</h2>
        {me.emailVerified && <span className="rt-pill rt-acc__status -completed">{copy.basic.verified}</span>}
      </div>
      <p className="rt-acc__note">{copy.basic.lead}</p>
      <PhotoRow me={me} />
      <div className="rt-contact__pair">
        <Field id="rt-pf-first" label="First name" error={s.errors.firstName} type="text" autoComplete="given-name" value={s.values.firstName} onChange={s.set("firstName")} />
        <Field id="rt-pf-last" label="Last name" error={s.errors.lastName} type="text" autoComplete="family-name" value={s.values.lastName} onChange={s.set("lastName")} />
      </div>
      <div className="rt-contact__pair">
        <Field id="rt-pf-dob" label="Date of birth" error={s.errors.dateOfBirth} type="date" autoComplete="bday" min="1900-01-01" max={today()} value={s.values.dateOfBirth} onChange={s.set("dateOfBirth")} />
        <Field id="rt-pf-phone" label="Contact number" error={s.errors.phone} type="tel" autoComplete="tel" value={s.values.phone} onChange={s.set("phone")} />
      </div>
      <Foot busy={s.busy} label={copy.save} saved={s.saved} general={s.general} />
    </form>
  );
}

function PhotoRow({ me }) {
  const utils = api.useUtils();
  const uploadUrl = api.me.photoUploadUrl.useMutation();
  const setPhoto = api.me.setPhoto.useMutation();
  const removePhoto = api.me.removePhoto.useMutation();
  const input = useRef(null);
  const [state, setState] = useState({ busy: false, error: "", saved: "" });
  const initials = `${me.profile.firstName[0] ?? ""}${me.profile.lastName[0] ?? ""}`.toUpperCase();

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setState({ busy: true, error: "", saved: "" });
    try {
      const blob = await squarePhoto(file);
      const { path, token } = await uploadUrl.mutateAsync({ contentType: blob.type });
      const { error } = await getSupabase().storage.from("avatars").uploadToSignedUrl(path, token, blob, { contentType: blob.type });
      if (error) throw new Error("The photo didn't upload. Please try again.");
      await setPhoto.mutateAsync({ path });
      await utils.me.get.invalidate();
      setState({ busy: false, error: "", saved: copy.photo.saved });
    } catch (err) {
      setState({ busy: false, error: err?.message || "The photo didn't upload. Please try again.", saved: "" });
    }
  };
  const remove = async () => {
    setState({ busy: true, error: "", saved: "" });
    try {
      await removePhoto.mutateAsync();
      await utils.me.get.invalidate();
      setState({ busy: false, error: "", saved: copy.photo.removed });
    } catch (err) {
      setState({ busy: false, error: errorsFrom(err).general, saved: "" });
    }
  };

  return (
    <div className="rt-acc__photo">
      {me.profile.photoUrl ? (
        <img className="rt-acc__photoimg" src={me.profile.photoUrl} alt="" width="64" height="64" />
      ) : (
        <span className="rt-acc__avatar rt-acc__photoimg" aria-hidden="true">{initials}</span>
      )}
      <div className="rt-acc__photobody">
        <strong>{copy.photo.title}</strong>
        <span className="rt-acc__note" id="rt-pf-photo-hint">{copy.photo.hint}</span>
        <div className="rt-acc__photoactions">
          <input ref={input} type="file" accept={PHOTO_ACCEPT} className="rt-sr" id="rt-pf-photo" onChange={choose} aria-describedby="rt-pf-photo-hint" tabIndex={-1} />
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => input.current?.click()} disabled={state.busy} aria-busy={state.busy}>
            {state.busy ? copy.saving : me.profile.photoUrl ? copy.photo.change : copy.photo.add}
          </button>
          {me.profile.photoUrl && !state.busy && <button type="button" className="rt-acc__linkbtn" onClick={remove}>{copy.photo.remove}</button>}
        </div>
        <p className="rt-acc__savedmsg" role="status">{state.saved}</p>
        {state.error && <p className="rt-q__err" role="alert">{state.error}</p>}
      </div>
    </div>
  );
}

// ---- address ----------------------------------------------------------------------------------------------------------------

function AddressSection({ me }) {
  const p = me.profile;
  const s = useSection(
    { street: p.street ?? "", city: p.city ?? "", postcode: p.postcode ?? "" },
    api.me.updateAddress.useMutation(),
    (v) => {
      const e = {};
      if (!v.street.trim()) e.street = "Enter your street address.";
      else if (v.street.trim().length > 100) e.street = "Use 100 characters or fewer.";
      if (!v.city.trim()) e.city = "Enter your town or city.";
      else if (v.city.trim().length > 60) e.city = "Use 60 characters or fewer.";
      if (!v.postcode.trim()) e.postcode = "Enter your postcode.";
      else if (!validPostcode(v.postcode)) e.postcode = "Enter a real postcode, like SW1A 1AA.";
      return e;
    },
  );
  // show the postcode as saved (tidied to capitals with one space)
  const done = (result, setValues) => {
    setValues((v) => ({ ...v, postcode: result.postcode }));
    return copy.saved;
  };
  return (
    <form className="rt-acc__card rt-acc__form" onSubmit={s.submit(done)} noValidate aria-labelledby="rt-pf-addr-h" ref={s.formRef}>
      <h2 className="rt-acc__h2" id="rt-pf-addr-h">{copy.address.title}</h2>
      <p className="rt-acc__note">{copy.address.lead}</p>
      <Field id="rt-pf-street" label="Street address" error={s.errors.street} type="text" autoComplete="street-address" value={s.values.street} onChange={s.set("street")} />
      <div className="rt-contact__pair">
        <Field id="rt-pf-city" label="Town or city" error={s.errors.city} type="text" autoComplete="address-level2" value={s.values.city} onChange={s.set("city")} />
        <Field id="rt-pf-postcode" label="Postcode" error={s.errors.postcode} type="text" autoComplete="postal-code" autoCapitalize="characters" spellCheck={false} value={s.values.postcode} onChange={s.set("postcode")} />
      </div>
      <Foot busy={s.busy} label={copy.save} saved={s.saved} general={s.general} />
    </form>
  );
}

// ---- email ------------------------------------------------------------------------------------------------------------------

function EmailSection({ me }) {
  const [returned, setReturned] = useState(false);
  useEffect(() => setReturned(new URLSearchParams(window.location.search).get("email") === "confirmed"), []);
  const s = useSection(
    { email: me.email ?? "", currentPassword: "" },
    api.me.changeEmail.useMutation(),
    (v) => {
      const e = {};
      if (!v.email.trim()) e.email = "Enter your email address.";
      else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter an email address in the correct format, like name@example.com.";
      else if (v.email.trim().toLowerCase() === (me.email ?? "").toLowerCase()) e.email = "This is already your email address.";
      if (!v.currentPassword) e.currentPassword = "Enter your current password.";
      return e;
    },
  );
  const done = (result, setValues) => {
    setValues((v) => ({ ...v, currentPassword: "" }));
    return copy.email.sent.replace("{email}", result.pendingEmail);
  };
  return (
    <form className="rt-acc__card rt-acc__form" onSubmit={s.submit(done)} noValidate aria-labelledby="rt-pf-email-h" ref={s.formRef}>
      <h2 className="rt-acc__h2" id="rt-pf-email-h">{copy.email.title}</h2>
      <p className="rt-acc__note">{copy.email.lead}</p>
      {me.pendingEmail && <p className="rt-acc__notice" role="status">{(returned ? copy.email.oneMore : copy.email.pending).replace("{email}", me.pendingEmail)}</p>}
      {!me.pendingEmail && returned && <p className="rt-acc__notice -ok" role="status">{copy.email.changed.replace("{email}", me.email)}</p>}
      {me.hasPassword ? (
        <>
          <div className="rt-contact__pair">
            <Field id="rt-pf-email" label="Email" error={s.errors.email} type="email" autoComplete="email" inputMode="email" spellCheck={false} value={s.values.email} onChange={s.set("email")} />
            <Field id="rt-pf-email-pw" label="Current password" error={s.errors.currentPassword} type="password" autoComplete="current-password" value={s.values.currentPassword} onChange={s.set("currentPassword")} />
          </div>
          <Foot busy={s.busy} label={copy.save} saved={s.saved} general={s.general} />
        </>
      ) : (
        <p className="rt-acc__note">{copy.noPassword}</p>
      )}
    </form>
  );
}

// ---- password ---------------------------------------------------------------------------------------------------------------

function PasswordSection({ me }) {
  const [shown, setShown] = useState(false);
  const s = useSection(
    { currentPassword: "", newPassword: "", confirm: "" },
    api.me.changePassword.useMutation(),
    (v) => {
      const e = {};
      if (!v.currentPassword) e.currentPassword = "Enter your current password.";
      if (v.newPassword.length < 8 || !/[a-z]/i.test(v.newPassword) || !/\d/.test(v.newPassword)) e.newPassword = "Enter a new password of at least 8 characters, with a letter and a number.";
      else if (v.newPassword === v.currentPassword) e.newPassword = "Choose a new password that is different from your current one.";
      else if (v.confirm !== v.newPassword) e.confirm = "The passwords do not match.";
      return e;
    },
    ({ currentPassword, newPassword }) => ({ currentPassword, newPassword }),
  );
  const done = (_result, setValues) => {
    setValues({ currentPassword: "", newPassword: "", confirm: "" });
    return copy.password.saved;
  };
  const type = shown ? "text" : "password";
  return (
    <form className="rt-acc__card rt-acc__form" onSubmit={s.submit(done)} noValidate aria-labelledby="rt-pw-h" ref={s.formRef}>
      <h2 className="rt-acc__h2" id="rt-pw-h">{copy.password.title}</h2>
      <p className="rt-acc__note">{copy.password.lead}</p>
      {me.hasPassword ? (
        <>
          <Field id="rt-pw-current" label="Current password" error={s.errors.currentPassword} type={type} autoComplete="current-password" value={s.values.currentPassword} onChange={s.set("currentPassword")} />
          <div className="rt-contact__pair">
            <Field id="rt-pw-new" label="New password" hint={copy.password.hint} error={s.errors.newPassword} type={type} autoComplete="new-password" value={s.values.newPassword} onChange={s.set("newPassword")} />
            <Field id="rt-pw-confirm" label="Repeat password" error={s.errors.confirm} type={type} autoComplete="new-password" value={s.values.confirm} onChange={s.set("confirm")} />
          </div>
          <label className="rt-bk__check" htmlFor="rt-pw-show"><input id="rt-pw-show" type="checkbox" checked={shown} onChange={(e) => setShown(e.target.checked)} /><span>{copy.password.show}</span></label>
          <Foot busy={s.busy} label={copy.password.save} saved={s.saved} general={s.general} outline />
        </>
      ) : (
        <p className="rt-acc__note">{copy.noPassword}</p>
      )}
    </form>
  );
}

// ---- marketing emails -------------------------------------------------------------------------------------------------------

function MarketingSection({ me }) {
  const s = useSection({ optIn: me.profile.marketingOptIn }, api.me.setMarketing.useMutation(), () => ({}));
  return (
    <form className="rt-acc__card rt-acc__form" onSubmit={s.submit()} noValidate aria-labelledby="rt-pf-mkt-h" ref={s.formRef}>
      <h2 className="rt-acc__h2" id="rt-pf-mkt-h">{copy.marketing.title}</h2>
      <label className="rt-bk__check" htmlFor="rt-pf-mkt"><input id="rt-pf-mkt" type="checkbox" checked={s.values.optIn} onChange={s.set("optIn")} /><span>{copy.marketing.label}</span></label>
      <p className="rt-acc__note">{copy.marketing.note}</p>
      <Foot busy={s.busy} label={copy.save} saved={s.saved} general={s.general} outline />
    </form>
  );
}

// ---- loading ----------------------------------------------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <div className="rt-acc__stack" aria-busy="true" aria-label={copy.loading}>
      {[3, 2, 1].map((rows, i) => (
        <div className="rt-acc__card rt-acc__form" key={i}>
          <span className="rt-skel rt-skel--line" style={{ width: "40%", height: 22 }} />
          {Array.from({ length: rows }, (_, r) => (
            <div className="rt-contact__pair" key={r}>
              <span className="rt-skel" style={{ height: 48 }} />
              <span className="rt-skel" style={{ height: 48 }} />
            </div>
          ))}
          <span className="rt-skel rt-skel--btn" style={{ width: 140 }} />
        </div>
      ))}
    </div>
  );
}
