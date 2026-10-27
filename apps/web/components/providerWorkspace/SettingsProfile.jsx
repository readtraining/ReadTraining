"use client";

import React, { useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { getSupabase } from "@/lib/supabase/client";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { Pill } from "./providerParts";
import { Confirm, Counter, Field, aria, isUrlOn } from "./settingsForm";
import { EmptyState, ErrorState } from "@/components/states/States";
import { Loading } from "./providerParts";

// Settings tabs that use the API: provider information (headline, biography, town, social links), the logo, the terms learners
// see before they book, and the venues used by classroom dates. Every change shows on the public profile and course pages at once.

const useProfile = () => {
  const { organisationId } = useProviderAccess();
  return api.provider.profile.get.useQuery({ organisationId }, { enabled: Boolean(organisationId) });
};
const firstError = (e) => errorsFrom(e).general || Object.values(errorsFrom(e).fields)[0];

// shows a loading or error state until the profile is in, then the tab with it
function WithProfile({ children }) {
  const q = useProfile();
  if (q.isError) return <ErrorState title="We couldn't load your settings." text="Check your connection, then try again." onRetry={() => q.refetch()} />;
  if (!q.data) return <Loading rows={2} />;
  return children(q.data);
}

// ---- provider information --------------------------------------------------------------------------------------------------

const SOCIAL = [
  { key: "facebook", label: "Facebook", hosts: ["facebook.com"], example: "https://www.facebook.com/yourpage" },
  { key: "linkedin", label: "LinkedIn", hosts: ["linkedin.com"], example: "https://www.linkedin.com/company/yourcompany" },
  { key: "youtube", label: "YouTube", hosts: ["youtube.com"], example: "https://www.youtube.com/@yourchannel" },
];

export function InfoTab({ say }) {
  return <WithProfile>{(p) => <InfoForm profile={p} say={say} />}</WithProfile>;
}

function InfoForm({ profile, say }) {
  const { organisationId, can } = useProviderAccess();
  const utils = api.useUtils();
  const update = api.provider.profile.update.useMutation();
  const [f, setF] = useState({ headline: profile.headline, bio: profile.bio, city: profile.city, facebook: profile.socials.facebook || "", linkedin: profile.socials.linkedin || "", youtube: profile.socials.youtube || "" });
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const locked = !can("provider.profile.edit");

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.headline.trim()) errs.headline = "Enter a headline, like “First aid and fire training across West Yorkshire”.";
    if (!f.bio.trim()) errs.bio = "Write a short biography: who you are and where you train.";
    SOCIAL.forEach((x) => {
      if (f[x.key].trim() && !isUrlOn(f[x.key], x.hosts)) errs[x.key] = `Enter the full address of your ${x.label} page, like ${x.example}`;
    });
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    update.mutate(
      { organisationId, headline: f.headline.trim(), bio: f.bio.trim(), city: f.city.trim() || null, socials: Object.fromEntries(SOCIAL.map((x) => [x.key, f[x.key].trim()])) },
      { onSuccess: () => { utils.provider.profile.get.invalidate({ organisationId }); say("Provider information saved"); }, onError: (er) => setErrors({ form: firstError(er) }) },
    );
  };

  return (
    <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
      <p className="rt-acc__note">Provider name: <b>{profile.name}</b>. To change it, contact us: it was checked when your account was approved.</p>
      <Field id="rt-set-headline" label="Headline" error={errors.headline} count={<Counter value={f.headline} max={120} />}>
        <input {...aria("rt-set-headline", errors.headline)} type="text" maxLength={120} autoComplete="off" value={f.headline} onChange={set("headline")} disabled={locked} />
      </Field>
      <Field id="rt-set-bio" label="Biography" hint="Who you are, where you train and what makes your courses good." error={errors.bio} count={<Counter value={f.bio} max={5000} />}>
        <textarea {...aria("rt-set-bio", errors.bio, true)} rows={6} maxLength={5000} autoComplete="off" value={f.bio} onChange={set("bio")} disabled={locked} />
      </Field>
      <Field id="rt-set-city" label="Town or city (optional)" hint="Where you are based, shown on your public profile." error={errors.city}>
        <input {...aria("rt-set-city", errors.city, true)} type="text" maxLength={60} autoComplete="address-level2" value={f.city} onChange={set("city")} disabled={locked} className="rt-pws-set__short" />
      </Field>
      <fieldset className="rt-pws-set__group">
        <legend>Social media (optional)</legend>
        <div className="rt-pws-set__grid">
          {SOCIAL.map((x) => (
            <Field key={x.key} id={`rt-set-${x.key}`} label={x.label} error={errors[x.key]}>
              <input {...aria(`rt-set-${x.key}`, errors[x.key])} type="url" inputMode="url" autoComplete="url" placeholder={x.example} value={f[x.key]} onChange={set(x.key)} disabled={locked} />
            </Field>
          ))}
        </div>
      </fieldset>
      {errors.form && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{errors.form}</p>}
      <div className="rt-pws-set__foot">
        <p className="rt-acc__note">{locked ? "Your role can see these details but not change them." : "Changes show on your public profile and course pages as soon as you save."}</p>
        {!locked && <button type="submit" className="button -md -purple-1 text-white" disabled={update.isPending} aria-busy={update.isPending || undefined}>{update.isPending ? "Saving…" : "Save"}</button>}
      </div>
    </form>
  );
}

// ---- company logo ----------------------------------------------------------------------------------------------------------

const LOGO_MAX = 2 * 1024 * 1024; // the course-media bucket's limit
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function LogoTab({ say }) {
  return <WithProfile>{(p) => <LogoForm profile={p} say={say} />}</WithProfile>;
}

function LogoForm({ profile, say }) {
  const { organisationId, can } = useProviderAccess();
  const utils = api.useUtils();
  const uploadUrl = api.provider.profile.logoUploadUrl.useMutation();
  const setLogo = api.provider.profile.setLogo.useMutation();
  const removeLogo = api.provider.profile.removeLogo.useMutation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const locked = !can("provider.profile.edit");
  const done = (message) => { utils.provider.profile.get.invalidate({ organisationId }); say(message); };

  // the picture's size, checked before it is uploaded
  const measure = (file) => new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => { resolve({ w: img.width, h: img.height }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return setError("Choose a PNG, JPG or WebP image.");
    if (file.size > LOGO_MAX) return setError("Choose an image smaller than 2 MB.");
    const size = await measure(file);
    if (!size) return setError("That image could not be read. Try another file.");
    if (size.w < 200 || size.h < 200) return setError("The logo must be at least 200 × 200 pixels.");
    setError("");
    setBusy(true);
    try {
      const { path, token } = await uploadUrl.mutateAsync({ organisationId, contentType: file.type });
      const { error: upError } = await getSupabase().storage.from("course-media").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (upError) throw new Error("The logo didn't upload. Please try again.");
      await setLogo.mutateAsync({ organisationId, path });
      done("Logo saved");
    } catch (err) {
      setError(err?.data ? firstError(err) : err.message || "The logo didn't upload. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const remove = () => {
    setBusy(true);
    removeLogo.mutate({ organisationId }, { onSuccess: () => done("Logo removed"), onError: (er) => setError(firstError(er)), onSettled: () => setBusy(false) });
  };

  return (
    <div className="rt-acc__card rt-q__form rt-pws-set__form" aria-busy={busy || undefined}>
      {error && <p className="rt-q__err" id="rt-set-logo-e" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
      <div className="rt-pws-set__logo">
        <span className="rt-pws-set__logobox">
          {profile.logoUrl ? <img src={profile.logoUrl} alt="Your logo" width={96} height={96} /> : <span aria-hidden="true">{profile.name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>}
        </span>
        <div className="rt-pws-set__logoside">
          <input ref={fileRef} id="rt-set-logo" type="file" accept={LOGO_TYPES.join(",")} className="rt-sr" tabIndex={-1} aria-hidden="true" onChange={pick} />
          {!locked && (
            <div className="rt-pws-set__actions">
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? "Saving…" : profile.logoUrl ? "Change logo" : "Upload logo"}</button>
              {profile.logoUrl && <button type="button" className="rt-pws-set__textbtn" onClick={remove} disabled={busy}>Remove logo</button>}
            </div>
          )}
          <p className="rt-field__hint">At least 200 × 200 pixels. PNG, JPG or WebP, up to 2 MB. It is saved as soon as you choose it.</p>
        </div>
      </div>
    </div>
  );
}

// ---- terms -----------------------------------------------------------------------------------------------------------------

export function TermsTab({ say }) {
  return <WithProfile>{(p) => <TermsForms profile={p} say={say} />}</WithProfile>;
}

function TermsForms({ profile, say }) {
  const { organisationId, can } = useProviderAccess();
  const utils = api.useUtils();
  const update = api.provider.profile.updateTerms.useMutation();
  const locked = !can("provider.terms.edit");
  // both texts are saved together; each form changes its own
  const save = (patch, saved, onError) => update.mutate(
    { organisationId, cancellationPolicy: profile.cancellationPolicy || null, bookingTerms: profile.bookingTerms || null, ...patch },
    { onSuccess: () => { utils.provider.profile.get.invalidate({ organisationId }); say(saved); }, onError: (er) => onError(firstError(er)) },
  );
  return (
    <div className="rt-acc__stack">
      <TextDoc id="rt-set-policy" title="Cancellation policy" required value={profile.cancellationPolicy} locked={locked} busy={update.isPending}
        text="When learners can cancel or change dates, and what they get back. Learners see this before they pay, so keep it short and plain."
        onSave={(v, onError) => save({ cancellationPolicy: v }, "Cancellation policy saved", onError)} />
      <TextDoc id="rt-set-terms" title="Booking terms" value={profile.bookingTerms} locked={locked} busy={update.isPending}
        text="Your own terms for learners, if you have them. They sit alongside ReadTraining's booking terms."
        onSave={(v, onError) => save({ bookingTerms: v || null }, "Booking terms saved", onError)} />
    </div>
  );
}

function TextDoc({ id, title, text, value, required, locked, busy, onSave }) {
  const max = id === "rt-set-terms" ? 20000 : 10000;
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
    onSave(v.trim(), setError);
  };
  return (
    <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
      <Field id={id} label={`${title}${required ? "" : " (optional)"}`} hint={text} error={error} count={<Counter value={v} max={max} />}>
        <textarea {...aria(id, error, true)} rows={9} maxLength={max} autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} disabled={locked} />
      </Field>
      {!locked && (
        <div className="rt-pws-set__foot">
          <span></span>
          <button type="submit" className="button -md -outline-purple-1 text-purple-1" disabled={busy || v.trim() === (value || "")}>Save {title.toLowerCase()}</button>
        </div>
      )}
    </form>
  );
}

// ---- venues ----------------------------------------------------------------------------------------------------------------

const POSTCODE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/;

// The places classroom dates are held. Each date picks one; archived venues stay on their past dates but can't be picked again.
export function VenuesTab({ say }) {
  const { organisationId, can } = useProviderAccess();
  const utils = api.useUtils();
  const query = api.provider.venues.list.useQuery({ organisationId }, { enabled: Boolean(organisationId) });
  const setActive = api.provider.venues.setActive.useMutation();
  const remove = api.provider.venues.remove.useMutation();
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, a venue = edit it
  const [removing, setRemoving] = useState(null);
  const [blocked, setBlocked] = useState("");
  const edit = can("provider.cohorts.edit");
  const refresh = () => utils.provider.venues.list.invalidate({ organisationId });

  if (query.isError) return <ErrorState title="We couldn't load your venues." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  if (!query.data) return <Loading rows={2} />;
  const venues = query.data;

  return (
    <div className="rt-acc__stack">
      {edit && <div><button type="button" className="button -md -purple-1 text-white" onClick={() => setEditing(null)}>Add venue</button></div>}
      {venues.length ? (
        <div className="rt-acc__card">
          <ul className="rt-adm-list">
            {venues.map((v) => (
              <li key={v.id}>
                <div>
                  <b>{v.name}</b>{!v.active && <> <Pill tone="muted">Archived</Pill></>}
                  <small>{[v.street, v.city, v.postcode].filter(Boolean).join(", ")}</small>
                  <small>{v.upcoming ? `${v.upcoming} upcoming ${v.upcoming === 1 ? "date" : "dates"}` : "No upcoming dates"}{v.located ? "" : " · We couldn't find this postcode on the map, so distance search can't use it. Check the postcode."}</small>
                </div>
                {edit && (
                  <div className="rt-adm-list__side">
                    <button type="button" className="fb-textlink rt-pws-course-linkbtn" onClick={() => setEditing(v)}>Edit<span className="rt-sr"> {v.name}</span></button>
                    <button type="button" className="fb-textlink rt-pws-course-linkbtn" disabled={setActive.isPending} onClick={() => setActive.mutate({ organisationId, venueId: v.id, active: !v.active }, { onSuccess: () => { refresh(); say(v.active ? "Venue archived" : "Venue restored"); }, onError: (e) => say(firstError(e)) })}>{v.active ? "Archive" : "Restore"}<span className="rt-sr"> {v.name}</span></button>
                    <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => { setBlocked(""); setRemoving(v); }}>Delete<span className="rt-sr"> {v.name}</span></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : <EmptyState title="No venues yet" text="Add the places you run classroom courses. Each classroom date picks one." action={edit ? { label: "Add venue", onClick: () => setEditing(null) } : null} />}

      <VenueSheet open={editing !== undefined} venue={editing || null} onClose={() => setEditing(undefined)} onSaved={(r, isNew) => { setEditing(undefined); refresh(); say(r.located ? (isNew ? "Venue added" : "Venue saved") : "Venue saved, but we couldn't find its postcode on the map"); }} />
      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this venue?" text={removing ? `${removing.name} is removed for good.` : ""} confirmLabel={remove.isPending ? "Deleting…" : "Delete venue"} blocked={blocked}
        onConfirm={() => remove.mutate({ organisationId, venueId: removing.id }, { onSuccess: () => { setRemoving(null); refresh(); say("Venue deleted"); }, onError: (e) => setBlocked(firstError(e)) })} />
    </div>
  );
}

function VenueSheet({ open, venue, onClose, onSaved }) {
  return (
    <Sheet open={open} onClose={onClose} title={venue ? "Edit venue" : "Add venue"} closeLabel="Close">
      {open && <VenueForm venue={venue} onSaved={onSaved} />}
    </Sheet>
  );
}

// A venue's fields and its Save, checked here as the API checks them. `venue` to edit one (null for a new one); onSaved(result,
// isNew) with the API's { id, located }. `inline`: inside another form (Create cohort), so it isn't a <form> of its own: Save is a
// plain button and Enter in a field saves the venue, not the outer form; `idPrefix` keeps its ids apart; onCancel shows Cancel.
export function VenueForm({ venue = null, onSaved, onCancel, inline = false, idPrefix = "rt-set-v" }) {
  const { organisationId } = useProviderAccess();
  const save = api.provider.venues.save.useMutation();
  const [f, setF] = useState(() => (venue ? { name: venue.name, street: venue.street, city: venue.city, postcode: venue.postcode || "" } : { name: "", street: "", city: "", postcode: "" }));
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = (e) => {
    e?.preventDefault();
    const err = {};
    if (f.name.trim().length < 2) err.name = "Enter the venue name.";
    if (f.street.trim().length < 3) err.street = "Enter the street address.";
    if (f.city.trim().length < 2) err.city = "Enter the town or city.";
    if (!POSTCODE.test(f.postcode.trim())) err.postcode = "Enter a full UK postcode, like LS1 4DL.";
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(ref.current);
    save.mutate(
      { organisationId, ...(venue ? { venueId: venue.id } : {}), name: f.name.trim(), street: f.street.trim(), city: f.city.trim(), postcode: f.postcode.trim() },
      { onSuccess: (r) => onSaved(r, !venue), onError: (er) => { const { fields, general } = errorsFrom(er); setErrors({ ...fields, form: general }); } },
    );
  };
  // inside another form, Enter in a field saves the venue instead of sending the outer form
  const onKeyDown = inline ? (e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); submit(); } } : undefined;
  const id = (k) => `${idPrefix}${k}`;
  const body = (
    <>
      <Field id={id("n")} label="Venue name" error={errors.name}>
        <input {...aria(id("n"), errors.name)} maxLength={100} autoComplete="organization" placeholder="For example: Northfield Training Centre" value={f.name} onChange={set("name")} />
      </Field>
      <Field id={id("s")} label="Street address" error={errors.street}>
        <input {...aria(id("s"), errors.street)} maxLength={160} autoComplete="street-address" value={f.street} onChange={set("street")} />
      </Field>
      <div className="rt-pws-course-grid2">
        <Field id={id("c")} label="Town or city" error={errors.city}>
          <input {...aria(id("c"), errors.city)} maxLength={60} autoComplete="address-level2" value={f.city} onChange={set("city")} />
        </Field>
        <Field id={id("p")} label="Postcode" hint="Used to place the venue on the map, so learners can search by distance." error={errors.postcode}>
          <input {...aria(id("p"), errors.postcode, true)} maxLength={8} autoComplete="postal-code" value={f.postcode} onChange={set("postcode")} />
        </Field>
      </div>
      {errors.form && <p className="rt-q__err" role="alert"><span className="rt-sr">Error: </span>{errors.form}</p>}
      <div className={onCancel ? "rt-pws-venueform__actions" : undefined}>
        <button type={inline ? "button" : "submit"} onClick={inline ? submit : undefined} className={`button -md -purple-1 text-white${onCancel ? "" : " rt-btn-block"}`} disabled={save.isPending} aria-busy={save.isPending || undefined}>{save.isPending ? "Saving…" : "Save venue"}</button>
        {onCancel && <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={onCancel} disabled={save.isPending}>Cancel</button>}
      </div>
    </>
  );
  return inline ? (
    <div className="rt-q__form rt-pws-venueform" role="group" aria-label="New venue" ref={ref} onKeyDown={onKeyDown}>{body}</div>
  ) : (
    <form className="rt-q__form" noValidate onSubmit={submit} ref={ref}>{body}</form>
  );
}
