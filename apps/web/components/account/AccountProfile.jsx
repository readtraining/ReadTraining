"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "@/data/account";
import { topBar } from "@/data/home";
import { api } from "@/lib/trpc/react";
import { errorsFrom, useMe } from "@/lib/useMe";
import { getSupabase } from "@/lib/supabase/client";
import { PHOTO_ACCEPT, squarePhoto } from "@/lib/photo";
import { validPostcode } from "@/lib/checkout";
import { focusFirstError } from "@/lib/focusFirstError";
import { useUnsavedChanges } from "@/lib/unsavedChanges";
import { Confirm } from "@/components/providerWorkspace/settingsForm";
import { ErrorState } from "@/components/states/States";
import DateField from "@/components/admin/DateField";
import Sheet from "@/components/testPrep/runner/Sheet";

const copy = account.profile;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[\p{L}][\p{L}\p{M} '’.-]*$/u;
const today = () => new Date().toISOString().slice(0, 10);
// the youngest a learner can be (the API checks the same: me.router.mts MIN_AGE): 16, the age the work courses here start from
const MIN_AGE = 16;
const latestBirthday = () => {
  const now = new Date();
  return `${now.getUTCFullYear() - MIN_AGE}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
};

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
      <BusinessSection me={me.data} />
      <CloseSection me={me.data} />
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
  // what is saved: the form has unsaved changes while its values differ (leaving then asks first, lib/unsavedChanges.js)
  const [base, setBase] = useState(initial);
  useUnsavedChanges(JSON.stringify(values) !== JSON.stringify(base));
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
      setBase(values);
      // a save's own tidying (a formatted postcode, a cleared password) counts as saved too
      const tidy = (next) => {
        const tidied = typeof next === "function" ? next(values) : next;
        setValues(tidied);
        setBase(tidied);
      };
      await utils.me.get.invalidate();
      setSaved(onDone ? onDone(result, tidy) || "" : copy.saved);
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
      else if (v.dateOfBirth > latestBirthday()) e.dateOfBirth = `You need to be at least ${MIN_AGE} to have a ReadTraining account.`;
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
        <div className="rt-field">
          <label htmlFor="rt-pf-dob">Date of birth</label>
          {s.errors.dateOfBirth && <p className="rt-q__err" id="rt-pf-dob-e"><span className="rt-sr">Error: </span>{s.errors.dateOfBirth}</p>}
          <DateField id="rt-pf-dob" value={s.values.dateOfBirth} onChange={(v) => s.set("dateOfBirth")({ target: { value: v } })} min="1900-01-01" max={latestBirthday()} invalid={Boolean(s.errors.dateOfBirth)} describedBy={s.errors.dateOfBirth ? "rt-pf-dob-e" : undefined} placeholder="Choose your date of birth" startView="decade" />
        </div>
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
  const [asking, setAsking] = useState(false); // "Remove your photo?" is open
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
          <input ref={input} type="file" accept={PHOTO_ACCEPT} className="rt-sr" id="rt-pf-photo" onChange={choose} tabIndex={-1} aria-hidden="true" />
          <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => input.current?.click()} disabled={state.busy} aria-busy={state.busy}>
            {state.busy ? copy.saving : me.profile.photoUrl ? copy.photo.change : copy.photo.add}
          </button>
          {me.profile.photoUrl && !state.busy && <button type="button" className="rt-acc__linkbtn" onClick={() => setAsking(true)} aria-haspopup="dialog">{copy.photo.remove}</button>}
        </div>
        <p className="rt-acc__savedmsg" role="status">{state.saved}</p>
        {state.error && <p className="rt-q__err" role="alert">{state.error}</p>}
      </div>
      <Confirm open={asking} onClose={() => setAsking(false)} title="Remove your photo?" text="It comes off your account. Your initials show instead, and you can add a photo again at any time." confirmLabel="Remove photo" onConfirm={() => { setAsking(false); remove(); }} />
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
    <form method="post" className="rt-acc__card rt-acc__form" onSubmit={s.submit(done)} noValidate aria-labelledby="rt-pf-email-h" ref={s.formRef}>
      <h2 className="rt-acc__h2" id="rt-pf-email-h">{copy.email.title}</h2>
      <p className="rt-acc__note">{copy.email.lead}</p>
      {me.pendingEmail && <p className="rt-acc__notice" role="status">{(returned ? copy.email.oneMore : copy.email.pending).replace("{email}", me.pendingEmail)}</p>}
      {!me.pendingEmail && me.lapsedEmail && <p className="rt-acc__notice" role="status">{copy.email.lapsed.replace("{email}", me.lapsedEmail)}</p>}
      {!me.pendingEmail && !me.lapsedEmail && returned && <p className="rt-acc__notice -ok" role="status">{copy.email.changed.replace("{email}", me.email)}</p>}
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
    <form method="post" className="rt-acc__card rt-acc__form" onSubmit={s.submit(done)} noValidate aria-labelledby="rt-pw-h" ref={s.formRef}>
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

// ---- the business account this person owns ---------------------------------------------------------------------------------
// A business account made by mistake, or to try it out, can be deleted by its owner while nobody else is on it (the API checks,
// organisations.deleteBusiness, and says so if someone is). Their own login and learner account stay as they are.
function BusinessSection({ me }) {
  const utils = api.useUtils();
  const router = useRouter();
  const remove = api.organisations.deleteBusiness.useMutation();
  const [asking, setAsking] = useState(false);
  const [state, setState] = useState({ error: "", done: "" });
  const business = (me.identities || []).find((i) => i.kind === "business" && i.role === "owner");
  if (!business && !state.done) return null;
  const confirm = async () => {
    setAsking(false);
    setState({ error: "", done: "" });
    try {
      await remove.mutateAsync({ organisationId: business.organisationId });
      setState({ error: "", done: `${business.name || "Your business account"} has been deleted.` });
      await utils.me.get.invalidate();
      router.refresh(); // the switch-account menus and the business pages follow
    } catch (err) {
      setState({ error: errorsFrom(err).general, done: "" });
    }
  };
  return (
    <section className="rt-acc__card rt-acc__form" aria-labelledby="rt-pf-biz-h">
      <h2 className="rt-acc__h2" id="rt-pf-biz-h" tabIndex={-1}>Your business account</h2>
      {state.done ? (
        <p className="rt-acc__savedmsg" role="status">{state.done}</p>
      ) : (
        <>
          <p className="rt-acc__note">
            <b>{business.name}</b>. Made it by mistake, or only to try it out? You can delete it while nobody else is on its team. Your own account stays as it is.
          </p>
          {state.error && <p className="rt-q__err" role="alert">{state.error}</p>}
          <div className="rt-acc__formfoot">
            <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={() => setAsking(true)} aria-haspopup="dialog" disabled={remove.isPending} aria-busy={remove.isPending || undefined}>
              {remove.isPending ? "Deleting…" : "Delete business account"}
            </button>
          </div>
          <Confirm open={asking} onClose={() => setAsking(false)} title={`Delete ${business.name}?`} text="The business account is removed for good. Your own account, bookings and settings stay as they are. This can't be undone." confirmLabel="Delete business account" onConfirm={confirm} />
        </>
      )}
    </section>
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

// ---- closing the account ------------------------------------------------------------------------------------------------------

// A request to close the account and delete the personal data (UK GDPR): saved on the server, logged, emailed to the person
// and to the admins who can suspend accounts (me.requestClosure). Our team closes it within one month; until then the
// section says so and the request can be withdrawn.
function CloseSection({ me }) {
  const c = copy.delete;
  const utils = api.useUtils();
  const request = api.me.requestClosure.useMutation();
  const withdraw = api.me.withdrawClosure.useMutation();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ reason: "", currentPassword: "" });
  const [errors, setErrors] = useState({});
  const [said, setSaid] = useState("");
  const openRef = useRef(null);
  const formRef = useRef(null);
  const day = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (me.hasPassword && !values.currentPassword) found.currentPassword = "Enter your current password.";
    if (values.reason.trim().length > 1000) found.reason = "Keep your reason to 1,000 characters or fewer.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    try {
      await request.mutateAsync({ reason: values.reason.trim() || undefined, currentPassword: me.hasPassword ? values.currentPassword : undefined });
      await utils.me.get.invalidate();
      setOpen(false);
      setValues({ reason: "", currentPassword: "" });
      setSaid(c.sent);
    } catch (err) {
      const { fields, general } = errorsFrom(err);
      setErrors({ ...fields, form: general });
      requestAnimationFrame(() => focusFirstError(formRef.current));
    }
  };
  const takeBack = async () => {
    setSaid("");
    try {
      await withdraw.mutateAsync();
      await utils.me.get.invalidate();
      setSaid(c.withdrawn);
    } catch (err) {
      setSaid(errorsFrom(err).general);
    }
  };

  // "Go to your business account": the pop-up closes, then the business section above comes into view with its heading focused
  const toBusiness = () => {
    setOpen(false);
    setTimeout(() => {
      const h = document.getElementById("rt-pf-biz-h");
      h?.scrollIntoView({ behavior: "smooth", block: "center" });
      h?.focus({ preventScroll: true });
    }, 300);
  };

  return (
    <section className="rt-acc__card rt-acc__form" aria-labelledby="rt-pf-close-h">
      <h2 className="rt-acc__h2" id="rt-pf-close-h">{c.title}</h2>
      {me.closure ? (
        <p className="rt-acc__notice -warn" role="status">{c.requested.replace("{date}", day(me.closure.requestedAt))}</p>
      ) : (
        <p className="rt-acc__note">{c.text}</p>
      )}
      {/* the page's action row, as the other sections' Save buttons */}
      <div className="rt-acc__formfoot">
        {me.closure ? (
          <button type="button" className="rt-acc__linkbtn" onClick={takeBack} disabled={withdraw.isPending} aria-busy={withdraw.isPending}>{c.withdraw}</button>
        ) : (
          <button type="button" ref={openRef} className="button -md -outline-purple-1 text-purple-1" aria-haspopup="dialog" onClick={() => { setErrors({}); setOpen(true); }}>{c.cta}</button>
        )}
        <p className="rt-acc__savedmsg" role="status">{said}</p>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={c.sheet.title} closeLabel="Close" fallbackFocus={openRef}>
        {/* something in the way (an admin, a provider or business they own): what to do first, instead of the form */}
        {me.closureBlockers?.length ? (
          <ClosureBlockers blockers={me.closureBlockers} onBusiness={toBusiness} onClose={() => setOpen(false)} />
        ) : (
          <form method="post" className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate ref={formRef}>
            {c.sheet.what.map((w) => <p key={w} className="rt-acc__note">{w}</p>)}
            <div className="rt-field">
              <label htmlFor="rt-pf-close-reason">{c.sheet.reason}</label>
              {errors.reason && <p className="rt-q__err" id="rt-pf-close-reason-e"><span className="rt-sr">Error: </span>{errors.reason}</p>}
              <textarea id="rt-pf-close-reason" rows={3} maxLength={1000} value={values.reason} onChange={(e) => setValues((v) => ({ ...v, reason: e.target.value }))} aria-invalid={errors.reason ? true : undefined} aria-describedby={errors.reason ? "rt-pf-close-reason-e" : undefined} />
            </div>
            {me.hasPassword && (
              <Field id="rt-pf-close-pw" label={c.sheet.password} error={errors.currentPassword} type="password" autoComplete="current-password" value={values.currentPassword} onChange={(e) => { const v = e.target.value; setValues((x) => ({ ...x, currentPassword: v })); }} />
            )}
            {errors.form && <p className="rt-q__err" role="alert">{errors.form}</p>}
            <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={request.isPending} aria-busy={request.isPending}>{request.isPending ? c.sheet.sending : c.sheet.submit}</button>
          </form>
        )}
      </Sheet>
    </section>
  );
}

// Shown in the pop-up when they press Request account closure and something has to happen first, each with its next step: a
// business account they can delete themselves (the section above on this page), anything else through our team or another admin.
// It goes once they've done it (me.get), and the pop-up shows the request form again.
function ClosureBlockers({ blockers, onBusiness, onClose }) {
  const b = copy.delete.blocked;
  const contact = b.contactHint.replace("{phone}", topBar.phone).replace("{hours}", topBar.hours).replace("{email}", topBar.email);
  // the account's name in bold
  const named = (text, name) => text.split("{name}").flatMap((part, i) => (i ? [<b key={i}>{name}</b>, part] : [part]));
  const line = (x) => {
    if (x.kind === "admin") return { key: "admin", text: b.admin };
    if (x.kind === "provider") return { key: x.name, text: named(b.provider, x.name), contact: true };
    if (x.others) return { key: x.name, text: named(b.businessTeam.replace("{others}", x.others).replace("{people}", x.others === 1 ? "person" : "people"), x.name), contact: true };
    return { key: x.name, text: named(b.business, x.name), business: true };
  };
  const lines = blockers.map(line);
  return (
    <div className="rt-biz__sheetform rt-acc__blocked">
      <p className="rt-acc__note"><strong>{b.lead}</strong></p>
      <ul className="rt-acc__blockers">
        {lines.map((l) => (
          <li key={l.key}>
            <p className="rt-acc__note">{l.text}</p>
            {l.business && <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onBusiness}>{b.toBusiness}</button>}
            {l.contact && (
              <>
                <a href="/contact-us" className="button -md -outline-purple-1 text-purple-1">{b.contact}</a>
                <p className="rt-acc__note">{contact}</p>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="rt-acc__note">{b.after}</p>
      <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={onClose}>{b.close}</button>
    </div>
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
