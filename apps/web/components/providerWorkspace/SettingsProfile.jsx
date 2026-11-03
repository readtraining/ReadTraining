"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sheet from "@/components/testPrep/runner/Sheet";
import { api } from "@/lib/trpc/react";
import { useWorkspace } from "@/lib/workspaceContext";
import { useProviderAccess } from "@/lib/providerAccess";
import { getSupabase } from "@/lib/supabase/client";
import { errorsFrom } from "@/lib/useMe";
import { focusFirstError } from "@/lib/focusFirstError";
import { Pill } from "./providerParts";
import { Confirm, Counter, Field, aria, isUrlOn } from "./settingsForm";
import { useUnsavedChanges } from "@/lib/unsavedChanges";
import { acceptFor, hintFor, prepareImage, whenLoaded } from "@/lib/images";
import { EmptyState, ErrorState } from "@/components/states/States";
import { Loading } from "./providerParts";

// Settings tabs that use the API: provider information (the name while under review, headline, biography, town, social links), the logo, the terms learners
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

// the provider's name can change while its application is being reviewed (owner and admin); after approval it goes through us
const UNDER_REVIEW = ["pending", "changes_requested"];

function InfoForm({ profile, say }) {
  const { organisationId, can } = useProviderAccess();
  const router = useRouter();
  const workspace = useWorkspace();
  const utils = api.useUtils();
  const update = api.provider.profile.update.useMutation();
  const [f, setF] = useState({ name: profile.name, headline: profile.headline, bio: profile.bio, city: profile.city, facebook: profile.socials.facebook || "", linkedin: profile.socials.linkedin || "", youtube: profile.socials.youtube || "" });
  const [errors, setErrors] = useState({});
  // what is saved (updated on a save, without waiting for the profile to load again): leaving with changes asks first
  const [savedF, setSavedF] = useState(f);
  const formRef = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const locked = !can("provider.profile.edit");
  useUnsavedChanges(!locked && JSON.stringify(f) !== JSON.stringify(savedF));
  const underReview = UNDER_REVIEW.includes(profile.status);
  const canRename = underReview && can("provider.profile.rename");

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (canRename && f.name.trim().length < 2) errs.name = "Enter your company or instructor name.";
    if (!f.headline.trim()) errs.headline = "Enter a headline, like “First aid and fire training across West Yorkshire”.";
    if (!f.bio.trim()) errs.bio = "Write a short biography: who you are and where you train.";
    SOCIAL.forEach((x) => {
      if (f[x.key].trim() && !isUrlOn(f[x.key], x.hosts)) errs[x.key] = `Enter the full address of your ${x.label} page, like ${x.example}`;
    });
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(formRef.current);
    update.mutate(
      { organisationId, ...(canRename ? { name: f.name.trim() } : {}), headline: f.headline.trim(), bio: f.bio.trim(), city: f.city.trim() || null, socials: Object.fromEntries(SOCIAL.map((x) => [x.key, f[x.key].trim()])) },
      {
        onSuccess: (r) => {
          setSavedF(f);
          utils.provider.profile.get.invalidate({ organisationId });
          utils.provider.profile.review.invalidate({ organisationId });
          // the name shows in the sidebar and the account menu: at once here, and from the server once it has caught up
          if (r.renamed) {
            workspace?.rename?.(f.name.trim());
            router.refresh();
          }
          say("Provider information saved");
        },
        onError: (er) => { const { fields, general } = errorsFrom(er); setErrors({ ...fields, form: general }); },
      },
    );
  };

  return (
    <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
      {canRename ? (
        <Field id="rt-set-name" label="Company or instructor name" hint="Learners see this name. You can change it until your account is approved." error={errors.name} count={<Counter value={f.name} max={100} />}>
          <input {...aria("rt-set-name", errors.name, true)} type="text" maxLength={100} autoComplete="organization" value={f.name} onChange={set("name")} />
        </Field>
      ) : (
        <p className="rt-acc__note">Provider name: <b>{profile.name}</b>. {underReview ? "The account owner or an admin can change it until your account is approved." : "To change it, contact us: it was checked when your account was approved."}</p>
      )}
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

// the rule every picture upload follows (lib/images.js): PNG, JPG or WebP up to 15 MB, made smaller for you, at least 200 × 200

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
  // What the box shows: the picture just chosen (from the file itself, at once) or none just removed (null), until the saved logo
  // has loaded in the browser; then the profile's own address. So it never goes blank while the saved copy loads.
  // `local`: { url (the chosen picture, or null once removed), was (the profile's logo when the change started) }
  const [local, setLocal] = useState(null);
  const logoUrl = local ? local.url : profile.logoUrl;
  useEffect(() => {
    if (!local || profile.logoUrl === local.was) return; // the profile hasn't caught up with the change yet
    if (!profile.logoUrl) return void setLocal(null); // removed, and the profile agrees
    let live = true;
    whenLoaded(profile.logoUrl).then(() => {
      if (!live) return;
      if (local.url?.startsWith("blob:")) URL.revokeObjectURL(local.url); // the chosen file's preview isn't needed any more
      setLocal(null); // the saved copy can show now
    });
    return () => {
      live = false;
    };
  }, [profile.logoUrl, local]);
  const fileRef = useRef(null);
  const locked = !can("provider.profile.edit");

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    let picture;
    try {
      picture = await prepareImage(file, "logo");
    } catch (err) {
      return setError(err.message);
    }
    const before = local;
    const preview = URL.createObjectURL(picture.blob);
    setLocal({ url: preview, was: profile.logoUrl }); // the chosen logo shows straight away
    setBusy(true);
    try {
      const { path, token } = await uploadUrl.mutateAsync({ organisationId, contentType: picture.type });
      const { error: upError } = await getSupabase().storage.from("course-media").uploadToSignedUrl(path, token, picture.blob, { contentType: picture.type });
      if (upError) throw new Error("The logo didn't upload. Please try again.");
      await setLogo.mutateAsync({ organisationId, path });
      utils.provider.profile.get.invalidate({ organisationId });
      say("Logo saved");
    } catch (err) {
      setLocal(before);
      URL.revokeObjectURL(preview);
      setError(err?.data ? firstError(err) : err.message || "The logo didn't upload. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const [asking, setAsking] = useState(false); // "Remove your logo?" is open
  const remove = () => {
    setAsking(false);
    setBusy(true);
    removeLogo.mutate({ organisationId }, {
      onSuccess: () => { setLocal({ url: null, was: profile.logoUrl }); utils.provider.profile.get.invalidate({ organisationId }); say("Logo removed"); },
      onError: (er) => setError(firstError(er)),
      onSettled: () => setBusy(false),
    });
  };

  return (
    <div className="rt-acc__card rt-q__form rt-pws-set__form" aria-busy={busy || undefined}>
      {error && <p className="rt-q__err" id="rt-set-logo-e" role="alert"><span className="rt-sr">Error: </span>{error}</p>}
      <div className="rt-pws-set__logo">
        <span className="rt-pws-set__logobox">
          {logoUrl ? <img src={logoUrl} alt="Your logo" width={96} height={96} /> : <span aria-hidden="true">{profile.name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>}
        </span>
        <div className="rt-pws-set__logoside">
          <input ref={fileRef} id="rt-set-logo" type="file" accept={acceptFor("logo")} className="rt-sr" tabIndex={-1} aria-hidden="true" onChange={pick} />
          {!locked && (
            <div className="rt-pws-set__actions">
              <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => fileRef.current?.click()} disabled={busy}>{busy && !removeLogo.isPending ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}</button>
              {logoUrl && <button type="button" className="rt-pws-set__textbtn" onClick={() => setAsking(true)} aria-haspopup="dialog" disabled={busy} aria-busy={removeLogo.isPending || undefined}>{removeLogo.isPending ? "Removing…" : "Remove logo"}</button>}
            </div>
          )}
          <p className="rt-field__hint">{hintFor("logo")} It is saved as soon as you choose it.</p>
        </div>
      </div>
      <Confirm open={asking} onClose={() => setAsking(false)} title="Remove your logo?" text="It comes off your public profile and course pages, and your initials show instead. You can upload a logo again at any time." confirmLabel="Remove logo" onConfirm={remove} />
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
  const save = (patch, saved, onError, onSaved) => update.mutate(
    { organisationId, cancellationPolicy: profile.cancellationPolicy || null, bookingTerms: profile.bookingTerms || null, ...patch },
    { onSuccess: () => { onSaved?.(); utils.provider.profile.get.invalidate({ organisationId }); say(saved); }, onError: (er) => onError(firstError(er)) },
  );
  return (
    <div className="rt-acc__stack">
      <TextDoc id="rt-set-policy" title="Cancellation policy" required value={profile.cancellationPolicy} locked={locked} busy={update.isPending}
        text="When learners can cancel or change dates, and what they get back. Learners see this before they pay, so keep it short and plain."
        onSave={(v, onError, onSaved) => save({ cancellationPolicy: v }, "Cancellation policy saved", onError, onSaved)} />
      <TextDoc id="rt-set-terms" title="Booking terms" value={profile.bookingTerms} locked={locked} busy={update.isPending}
        text="Your own terms for learners, if you have them. They sit alongside ReadTraining's booking terms."
        onSave={(v, onError, onSaved) => save({ bookingTerms: v || null }, "Booking terms saved", onError, onSaved)} />
    </div>
  );
}

function TextDoc({ id, title, text, value, required, locked, busy, onSave }) {
  const max = id === "rt-set-terms" ? 20000 : 10000;
  const [v, setV] = useState(value || "");
  const [error, setError] = useState("");
  // what is saved (set on a save, before the profile loads again)
  const [savedV, setSavedV] = useState(value || "");
  useUnsavedChanges(!locked && v.trim() !== savedV.trim());
  const formRef = useRef(null);
  const submit = (e) => {
    e.preventDefault();
    if (required && !v.trim()) {
      setError(`Enter your ${title.toLowerCase()}.`);
      return focusFirstError(formRef.current);
    }
    setError("");
    const sent = v.trim();
    onSave(sent, setError, () => setSavedV(sent));
  };
  return (
    <form className="rt-acc__card rt-q__form rt-pws-set__form" onSubmit={submit} noValidate ref={formRef}>
      <Field id={id} label={`${title}${required ? "" : " (optional)"}`} hint={text} error={error} count={<Counter value={v} max={max} />}>
        <textarea {...aria(id, error, true)} rows={9} maxLength={max} autoComplete="off" value={v} onChange={(e) => { setV(e.target.value); if (error) setError(""); }} disabled={locked} />
      </Field>
      {!locked && (
        <div className="rt-pws-set__foot">
          <span></span>
          <button type="submit" className="button -md -outline-purple-1 text-purple-1" disabled={busy || v.trim() === (value || "")} aria-busy={busy || undefined}>{busy ? "Saving…" : `Save ${title.toLowerCase()}`}</button>
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
  const [archiving, setArchiving] = useState(null);
  const toggleActive = (v) =>
    setActive.mutate({ organisationId, venueId: v.id, active: !v.active }, {
      onSuccess: () => { setArchiving(null); refresh(); say(v.active ? "Venue archived" : "Venue restored"); },
      onError: (e) => { setArchiving(null); say(firstError(e)); },
    });
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
                    {/* archiving takes the venue out of new dates, so it asks first; restoring doesn't */}
                    <button type="button" className="fb-textlink rt-pws-course-linkbtn" disabled={setActive.isPending} aria-busy={(setActive.isPending && setActive.variables?.venueId === v.id) || undefined} onClick={() => (v.active ? setArchiving(v) : toggleActive(v))}>{setActive.isPending && setActive.variables?.venueId === v.id ? (v.active ? "Archiving…" : "Restoring…") : v.active ? "Archive" : "Restore"}<span className="rt-sr"> {v.name}</span></button>
                    {/* a venue a date has used can't be deleted (its dates keep it): only archived, so Delete isn't offered */}
                    {!v.used && <button type="button" className="fb-textlink rt-pws-course-linkbtn rt-adm-danger" onClick={() => { setBlocked(""); setRemoving(v); }}>Delete<span className="rt-sr"> {v.name}</span></button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : <EmptyState title="No venues yet" text="Add the places you run classroom courses. Each classroom date picks one." action={edit ? { label: "Add venue", onClick: () => setEditing(null) } : null} />}

      <VenueSheet open={editing !== undefined} venue={editing || null} onClose={() => setEditing(undefined)} onSaved={(r, isNew) => { setEditing(undefined); refresh(); say(r.located ? (isNew ? "Venue added" : "Venue saved") : "Venue saved, but we couldn't find its postcode on the map"); }} />
      <Confirm open={Boolean(archiving)} onClose={() => setArchiving(null)} title="Archive this venue?" text={archiving ? `${archiving.name} can't be picked for new dates. Its dates keep it, and you can restore it at any time.` : ""} confirmLabel={setActive.isPending ? "Archiving…" : "Archive venue"} busy={setActive.isPending} onConfirm={() => toggleActive(archiving)} />
      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this venue?" text={removing ? `${removing.name} is removed for good.` : ""} confirmLabel={remove.isPending ? "Deleting…" : "Delete venue"} blocked={blocked} busy={remove.isPending}
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
  const [start] = useState(f);
  useUnsavedChanges(JSON.stringify(f) !== JSON.stringify(start)); // typed into but not saved (the form closes once saved)
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
