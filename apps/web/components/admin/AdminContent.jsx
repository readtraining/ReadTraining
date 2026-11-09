"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSavedSnapshot } from "@/lib/unsavedChanges";
import { refreshSiteContent } from "@/app/admin/actions";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import Sheet from "@/components/testPrep/runner/Sheet";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { faqGroups, faqSet, faqSets } from "@/data/faqSets";
import { contentDefaults } from "@/data/home";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { builtInLegal, getLegalList, legalContentKey } from "@/lib/legal";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { Tabs, formatWhen, getQuery, setQuery, TableSkeleton } from "./adminParts";
import { FaqForm, LegalForm } from "./AdminContentPages";
import { History, SaveRow, describedBy, field, useSave } from "./contentParts";

const copy = A.content;
const TABS = Object.keys(copy.tabs);
const MAX_TABS = 4;
const MAX_PER_TAB = 4;
const LEGAL = getLegalList();
const faqOptions = faqGroups.flatMap((g) => g.sets.map((x) => ({ value: x.key, label: `${g.name}: ${x.label}` })));

// Site content (Part B, B2): the numbers and featured courses the whole site shares (the customer reviews have
// their own page, admin › Customer reviews), each page's
// FAQs, and the legal pages (API content.*). Each tab saves its own piece; a piece that was never saved shows the site's
// built-in wording ("Use the built-in wording" goes back to it), and every saved version is kept under "Earlier versions". With
// the "content" switch an admin can change them; after a save the site's saved copy is marked out of date, so every page shows
// it within seconds. Tab, FAQ page and legal page are kept in the address.
export default function AdminContent() {
  const me = useAdminAccess();
  const canEdit = me?.permissions?.includes("content");
  const [tab, setTab] = useState("trust");
  const [faqKey, setFaqKey] = useState(faqSets[0].key);
  const [docSlug, setDocSlug] = useState(LEGAL[0].slug);
  const [version, setVersion] = useState(0); // a reset starts the tab's form again from the built-in values
  const [loaded, setLoaded] = useState(null); // an earlier version brought into the form: { key, id, at, value }
  const [said, setSaid] = useState("");
  const [confirming, setConfirming] = useState(false);
  const utils = api.useUtils();
  const reset = api.content.reset.useMutation();
  const site = api.content.site.useQuery();
  const changes = api.content.changes.useQuery();
  useEffect(() => {
    const t = getQuery("tab");
    if (TABS.includes(t)) setTab(t);
    if (faqSet(getQuery("set"))) setFaqKey(getQuery("set"));
    if (LEGAL.some((d) => d.slug === getQuery("doc"))) setDocSlug(getQuery("doc"));
  }, []);
  if (site.isLoading || changes.isLoading) return <TableSkeleton rows={5} />;
  if (site.error || changes.error) return <ErrorState onRetry={() => { site.refetch(); changes.refetch(); }} />;

  const faq = faqSet(faqKey);
  const legal = LEGAL.find((d) => d.slug === docSlug);
  // the key this tab edits, and what it shows when nothing was saved
  const contentKey = tab === "faqs" ? `faq:${faqKey}` : tab === "legal" ? legalContentKey(docSlug) : tab;
  const builtIn = tab === "faqs" ? { items: faq.defaults() } : tab === "legal" ? builtInLegal(docSlug) : contentDefaults[tab];
  const here = loaded?.key === contentKey ? loaded : null;
  const value = here ? here.value : site.data[contentKey] ?? builtIn;
  const when = changes.data?.[contentKey];

  const pick = (t) => {
    setTab(t);
    setSaid("");
    setLoaded(null);
    setQuery("tab", t === "trust" ? "" : t);
    setQuery("set", t === "faqs" ? faqKey : "");
    setQuery("doc", t === "legal" ? docSlug : "");
  };
  const pickFaq = (k) => {
    setFaqKey(k);
    setSaid("");
    setLoaded(null);
    setQuery("set", k);
  };
  const pickDoc = (d) => {
    setDocSlug(d);
    setSaid("");
    setLoaded(null);
    setQuery("doc", d);
  };
  const doReset = async () => {
    try {
      await reset.mutateAsync({ key: contentKey });
      await utils.content.invalidate();
      utils.admin.activity.list.invalidate();
      await refreshSiteContent();
      setVersion((v) => v + 1);
      setLoaded(null);
      setSaid(copy.resetDone);
    } catch (err) {
      setSaid(errorsFrom(err).general);
    }
    setConfirming(false);
  };
  const Panel = { trust: TrustForm, featured: FeaturedForm, faqs: FaqForm, legal: LegalForm }[tab];
  const panelProps = tab === "faqs" ? { contentKey, set: faq } : tab === "legal" ? { contentKey, doc: legal } : {};

  return (
    <div className="rt-acc__stack">
      <Tabs tabs={TABS.map((key) => ({ key, label: copy.tabs[key] }))} value={tab} onChange={pick} label="Show site content" />
      {!canEdit && <p className="rt-acc__notice">{copy.readOnly}</p>}

      {tab === "faqs" && (
        <div className="rt-acc__card">
          <p className="rt-acc__note">{copy.faqs.note}</p>
          <div className="rt-field rt-adm-mt">
            <label htmlFor="rt-adm-faq-pick">{copy.faqs.pick}</label>
            <FieldSelect id="rt-adm-faq-pick" label={copy.faqs.pick} value={faqKey} onChange={pickFaq} options={faqOptions} />
          </div>
          <a href={faq.href} target="_blank" rel="noreferrer" className="fb-textlink rt-adm-mt">{copy.faqs.view}<i className="icon-arrow-top-right text-12" aria-hidden="true"></i></a>
        </div>
      )}
      {tab === "legal" && (
        <div className="rt-acc__card">
          <p className="rt-acc__note">{copy.legal.note}</p>
          <div className="rt-field rt-adm-mt">
            <label htmlFor="rt-adm-legal-pick">{copy.legal.pick}</label>
            <FieldSelect id="rt-adm-legal-pick" label={copy.legal.pick} value={docSlug} onChange={pickDoc} options={LEGAL.map((d) => ({ value: d.slug, label: d.title }))} />
          </div>
          <a href={legal.href} target="_blank" rel="noreferrer" className="fb-textlink rt-adm-mt">{copy.legal.view}<i className="icon-arrow-top-right text-12" aria-hidden="true"></i></a>
        </div>
      )}

      <div className="rt-acc__notice rt-adm-content__status">
        <p className="rt-acc__note">{when ? copy.lastChanged.replace("{when}", formatWhen(Date.parse(when.at))).replace("{who}", when.by || "an admin") : <BuiltInNote contentKey={contentKey} />}</p>
        {when && canEdit && <button type="button" className="rt-cd__link" onClick={() => setConfirming(true)}>{copy.reset}</button>}
      </div>
      <History contentKey={contentKey} canEdit={canEdit} onUse={(v) => { setLoaded(v); setSaid(""); }} />
      {here && (
        <p className="rt-acc__notice">
          {copy.history.showing.replace("{when}", formatWhen(Date.parse(here.at)))}{" "}
          <button type="button" className="rt-cd__link" onClick={() => setLoaded(null)}>{copy.history.cancel}</button>
        </p>
      )}
      <p className="rt-acc__note" role="status">{said}</p>
      <Panel key={`${contentKey}-${version}-${here?.id ?? ""}`} value={value} canEdit={canEdit} {...panelProps} />

      <Sheet open={confirming} onClose={() => setConfirming(false)} title={copy.resetTitle} closeLabel="Close">
        <div className="rt-q__form rt-biz__sheetform">
          <p className="rt-adm-strong">{tab === "faqs" ? faq.label : tab === "legal" ? legal.title : copy.tabs[tab]}</p>
          <p className="rt-acc__note">{copy.resetText}</p>
          <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={doReset} disabled={reset.isPending}>{copy.reset}</button>
        </div>
      </Sheet>
    </div>
  );
}

// the status line when a piece shows its built-in wording: "again" when it was saved before (its history has versions)
function BuiltInNote({ contentKey }) {
  const history = api.content.history.useQuery({ key: contentKey });
  return history.data?.length ? copy.builtInAgain : copy.neverChanged;
}

// ---- trust numbers -------------------------------------------------------------------------------------------------------
function TrustForm({ value, canEdit }) {
  const save = useSave("trust");
  // an empty field is a number not entered: the site leaves it out
  const text = (n) => (n == null ? "" : String(n));
  const [v, setV] = useState(() => ({ rating: value.rating == null ? "" : value.rating.toFixed(1), reviews: text(value.reviews), customers: text(value.customers), courses: text(value.courses), source: value.source ?? "", sourceUrl: value.sourceUrl ?? "" }));
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const markSaved = useSavedSnapshot(v); // leaving with unsaved changes asks first
  const ref = useRef(null);
  const c = copy.trust;
  const num = (t) => (/^\d{1,9}$/.test(t.trim()) ? Number(t.trim()) : null);
  const rating = /^[1-5](\.\d)?$/.test(v.rating.trim()) && Number(v.rating) <= 5 ? Number(v.rating) : null;
  const empty = (t) => !t.trim();
  const shown = (n) => `${n.toLocaleString("en-GB")}+`;
  // what the site will say: only the numbers entered (a rating with its reviews)
  const preview = [
    rating !== null && num(v.reviews) !== null && c.previewRating.replace("{rating}", rating.toFixed(1)).replace("{reviews}", shown(num(v.reviews))) + (v.source.trim() ? c.previewSource.replace("{source}", v.source.trim()) : ""),
    num(v.customers) !== null && c.previewCustomers.replace("{customers}", shown(num(v.customers))),
    num(v.courses) !== null && c.previewCourses.replace("{courses}", shown(num(v.courses))),
  ].filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setGeneral("");
    const found = {};
    if (!empty(v.rating) && rating === null) found.rating = "Enter a rating from 1 to 5, with one decimal place, like 4.9, or leave it empty.";
    for (const k of ["reviews", "customers", "courses"]) if (!empty(v[k]) && num(v[k]) === null) found[k] = "Enter a whole number, like 1160, or leave it empty.";
    if (!found.rating && !found.reviews && empty(v.rating) !== empty(v.reviews)) found[empty(v.rating) ? "rating" : "reviews"] = "Enter both the rating and the number of reviews, or leave both empty.";
    if (v.source.trim().length > 40) found.source = "Keep the source to 40 characters or fewer.";
    if (!empty(v.sourceUrl) && !/^https:\/\/\S+$/.test(v.sourceUrl.trim())) found.sourceUrl = "Enter the full link, starting https://, or leave it empty.";
    if (!empty(v.sourceUrl) && empty(v.source)) found.source = "Enter where the rating comes from, like Google, to go with the link.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    setSaving(true);
    try {
      await save({ rating: empty(v.rating) ? null : rating, reviews: num(v.reviews), customers: num(v.customers), courses: num(v.courses), source: v.source.trim() || null, sourceUrl: v.source.trim() && v.sourceUrl.trim() ? v.sourceUrl.trim() : null });
      setSaved(true);
      markSaved();
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      setErrors(fields);
      setGeneral(Object.keys(fields).length ? "" : g);
      if (Object.keys(fields).length) focusFirstError(ref.current);
    }
    setSaving(false);
  };

  return (
    <form className="rt-acc__card" onSubmit={submit} noValidate ref={ref}>
      <h2 className="rt-acc__h2">{c.title}</h2>
      <p className="rt-acc__note">{c.note}</p>
      <p className="rt-acc__notice -warn rt-adm-mt">{c.legal}</p>
      <div className="rt-adm-fees__grid rt-adm-content__grid">
        {Object.entries(c.fields).map(([k, f]) => (
          <React.Fragment key={k}>
            {field(`rt-adm-tr-${k}`, f.label, f.hint, errors[k], (
              <input id={`rt-adm-tr-${k}`} type="text" inputMode="decimal" value={v[k]} readOnly={!canEdit} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} aria-invalid={errors[k] ? true : undefined} aria-describedby={describedBy(`rt-adm-tr-${k}`, f.hint, errors[k])} className="rt-adm-num" />
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="rt-adm-fees__grid rt-adm-content__grid">
        {Object.entries(c.sourceFields).map(([k, f]) => (
          <React.Fragment key={k}>
            {field(`rt-adm-tr-${k}`, f.label, f.hint, errors[k], (
              <input id={`rt-adm-tr-${k}`} type={k === "sourceUrl" ? "url" : "text"} maxLength={k === "sourceUrl" ? 500 : 40} value={v[k]} readOnly={!canEdit} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} aria-invalid={errors[k] ? true : undefined} aria-describedby={describedBy(`rt-adm-tr-${k}`, f.hint, errors[k])} />
            ))}
          </React.Fragment>
        ))}
      </div>
      <p className="rt-acc__note rt-adm-content__preview" id="rt-adm-tr-preview">{preview.length ? c.preview.replace("{text}", preview.join(" · ")) : c.previewNone}</p>
      <SaveRow canEdit={canEdit} saving={saving} error={general} saved={saved} />
    </form>
  );
}

// real course numbers start at 1000: numbers saved before the sample courses were removed are left out
const realIds = (ids) => (ids || []).filter((id) => Number(id) >= 1000);

// ---- featured courses ----------------------------------------------------------------------------------------------------
function FeaturedForm({ value, canEdit }) {
  const save = useSave("featured");
  const options = api.admin.courses.options.useQuery();
  // the built-in tabs have no courses picked (the site shows each tab's most popular): their slots start empty
  const [groups, setGroups] = useState(() => value.groups.map((g) => ({ name: g.name, courses: Array.from({ length: MAX_PER_TAB }, (_, i) => (realIds(g.courses)[i] ? String(realIds(g.courses)[i]) : "")) })));
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const markSaved = useSavedSnapshot(groups);
  const ref = useRef(null);
  const c = copy.featured;
  if (!options.data) return null;
  const choices = [{ value: "", label: c.none }, ...options.data.filter((x) => x.listed).map((x) => ({ value: String(x.id), label: x.kind === "provider" ? `${x.title} · ${x.provider}` : x.title }))];
  const edit = (i, patch) => setGroups((gs) => gs.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const setCourse = (i, slot, v) => edit(i, { courses: groups[i].courses.map((x, k) => (k === slot ? v : x)) });

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setGeneral("");
    const found = {};
    const out = groups.map((g, i) => {
      const ids = g.courses.filter(Boolean).map(Number);
      if (g.name.trim().length < 2) found[`name${i}`] = "Enter the tab name.";
      if (!ids.length) found[`courses${i}`] = "Choose at least one course.";
      else if (new Set(ids).size !== ids.length) found[`courses${i}`] = "Choose each course once.";
      return { name: g.name.trim(), courses: ids };
    });
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    setSaving(true);
    try {
      await save({ groups: out });
      setSaved(true);
      markSaved();
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      setGeneral(g);
      if (fields.groups) setGeneral(fields.groups);
    }
    setSaving(false);
  };

  return (
    <form className="rt-acc__stack" onSubmit={submit} noValidate ref={ref}>
      <p className="rt-acc__note rt-adm-help">{c.note}</p>
      {groups.map((g, i) => (
        <section key={i} className="rt-acc__card" aria-labelledby={`rt-adm-fg-${i}`}>
          <div className="rt-acc__cardhead">
            <h2 className="rt-acc__h2" id={`rt-adm-fg-${i}`}>{g.name.trim() || `Tab ${i + 1}`}</h2>
            {canEdit && groups.length > 1 && <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setGroups((gs) => gs.filter((_, j) => j !== i))}>{c.removeTab}<span className="rt-sr">: {g.name}</span></button>}
          </div>
          {field(`rt-adm-fn-${i}`, c.tabName, "", errors[`name${i}`], (
            <input id={`rt-adm-fn-${i}`} type="text" maxLength={40} value={g.name} readOnly={!canEdit} onChange={(e) => edit(i, { name: e.target.value })} aria-invalid={errors[`name${i}`] ? true : undefined} aria-describedby={describedBy(`rt-adm-fn-${i}`, "", errors[`name${i}`])} />
          ))}
          {errors[`courses${i}`] && <p className="rt-q__err" id={`rt-adm-fc-${i}-e`}><span className="rt-sr">Error: </span>{errors[`courses${i}`]}</p>}
          <div className="rt-adm-fees__grid">
            {g.courses.map((id, slot) => (
              <div key={slot} className="rt-field">
                <label htmlFor={`rt-adm-fc-${i}-${slot}`}>{c.course.replace("{n}", slot + 1)}</label>
                <FieldSelect id={`rt-adm-fc-${i}-${slot}`} label={c.course.replace("{n}", slot + 1)} value={id} onChange={(v) => setCourse(i, slot, v)} options={choices} disabled={!canEdit} invalid={Boolean(errors[`courses${i}`])} describedBy={errors[`courses${i}`] ? `rt-adm-fc-${i}-e` : undefined} />
              </div>
            ))}
          </div>
        </section>
      ))}
      {canEdit && (groups.length < MAX_TABS
        ? <button type="button" className="rt-cd__link" onClick={() => setGroups((gs) => [...gs, { name: "", courses: Array(MAX_PER_TAB).fill("") }])}>+ {c.addTab}</button>
        : <p className="rt-acc__note">{c.maxTabs}</p>)}
      <SaveRow canEdit={canEdit} saving={saving} error={general} saved={saved} />
    </form>
  );
}

