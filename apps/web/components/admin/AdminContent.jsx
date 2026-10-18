"use client";

import React, { useEffect, useRef, useState } from "react";
import { refreshSiteContent } from "@/app/admin/actions";
import { FieldSelect } from "@/components/courses/CatalogueDropdown";
import Sheet from "@/components/testPrep/runner/Sheet";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { faqGroups, faqSet, faqSets } from "@/data/faqSets";
import { contentDefaults } from "@/data/home";
import { useAdmin } from "@/lib/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { builtInLegal, getLegalList, legalContentKey } from "@/lib/legal";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { Tabs, formatWhen, getQuery, setQuery } from "./adminParts";
import { FaqForm, LegalForm } from "./AdminContentPages";
import { SaveRow, describedBy, field, useSave } from "./contentParts";

const copy = A.content;
const TABS = Object.keys(copy.tabs);
const MAX_TABS = 4;
const MAX_PER_TAB = 4;
const LEGAL = getLegalList();
const faqOptions = faqGroups.flatMap((g) => g.sets.map((x) => ({ value: x.key, label: `${g.name}: ${x.label}` })));

// Site content (Part B, B2): the numbers, featured courses, testimonials and video words the whole site shares, each page's
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
  if (site.isLoading || changes.isLoading) return null;
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
  const Panel = { trust: TrustForm, featured: FeaturedForm, testimonials: Testimonials, video: VideoForm, faqs: FaqForm, legal: LegalForm }[tab];
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

      <div className="rt-adm-content__status">
        <p className="rt-acc__note rt-adm-help">{when ? copy.lastChanged.replace("{when}", formatWhen(Date.parse(when.at))).replace("{who}", when.by || "an admin") : copy.neverChanged}</p>
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

// The saved versions of one piece of content, newest first (who and when): look at the list, and with the "content" switch bring
// one back into the form (it is only live once it is saved again).
function History({ contentKey, canEdit, onUse }) {
  const h = copy.history;
  const utils = api.useUtils();
  const list = api.content.history.useQuery({ key: contentKey });
  const [error, setError] = useState("");
  const use = async (v) => {
    setError("");
    try {
      const r = await utils.content.version.fetch({ key: contentKey, id: v.id });
      onUse({ key: contentKey, id: v.id, at: v.at, value: r.value });
    } catch {
      setError(h.loadError);
    }
  };
  if (!list.data) return null;
  return (
    <details className="rt-adm-content__history">
      <summary>{h.title} <span className="rt-adm-muted">{list.data.length}</span></summary>
      {list.data.length ? (
        <ul className="rt-adm-list">
          {list.data.map((v) => (
            <li key={v.id}>
              <div>
                <span className="rt-adm-strong">{formatWhen(Date.parse(v.at))}</span>
                <small>{v.by || "an admin"}{v.reset ? ` · ${h.resetEntry}` : ""}</small>
              </div>
              {canEdit && !v.reset && <button type="button" className="rt-cd__link" onClick={() => use(v)}>{h.use}<span className="rt-sr"> {formatWhen(Date.parse(v.at))}</span></button>}
            </li>
          ))}
        </ul>
      ) : <p className="rt-acc__note">{h.none}</p>}
      {error && <p className="rt-q__err" role="alert">{error}</p>}
    </details>
  );
}

// ---- trust numbers -------------------------------------------------------------------------------------------------------
function TrustForm({ value, canEdit }) {
  const save = useSave("trust");
  const [v, setV] = useState(() => ({ rating: value.rating.toFixed(1), reviews: String(value.reviews), customers: String(value.customers), courses: String(value.courses) }));
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);
  const c = copy.trust;
  const num = (t) => (/^\d{1,9}$/.test(t.trim()) ? Number(t.trim()) : null);
  const rating = /^[1-5](\.\d)?$/.test(v.rating.trim()) && Number(v.rating) <= 5 ? Number(v.rating) : null;
  const shown = (n) => (n === null ? "…" : `${n.toLocaleString("en-GB")}+`);

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setGeneral("");
    const found = {};
    if (rating === null) found.rating = "Enter a rating from 1 to 5, with one decimal place, like 4.9.";
    for (const k of ["reviews", "customers", "courses"]) if (num(v[k]) === null) found[k] = "Enter a whole number, like 12450.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    setSaving(true);
    try {
      await save({ rating, reviews: num(v.reviews), customers: num(v.customers), courses: num(v.courses) });
      setSaved(true);
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
      <div className="rt-adm-fees__grid rt-adm-content__grid">
        {Object.entries(c.fields).map(([k, f]) => (
          <React.Fragment key={k}>
            {field(`rt-adm-tr-${k}`, f.label, f.hint, errors[k], (
              <input id={`rt-adm-tr-${k}`} type="text" inputMode="decimal" value={v[k]} readOnly={!canEdit} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} aria-invalid={errors[k] ? true : undefined} aria-describedby={describedBy(`rt-adm-tr-${k}`, f.hint, errors[k])} className="rt-adm-num" />
            ))}
          </React.Fragment>
        ))}
      </div>
      <p className="rt-acc__note rt-adm-content__preview" id="rt-adm-tr-preview">{c.preview.replace("{rating}", rating === null ? "…" : rating.toFixed(1)).replace("{reviews}", shown(num(v.reviews))).replace("{customers}", shown(num(v.customers))).replace("{courses}", shown(num(v.courses)))}</p>
      <SaveRow canEdit={canEdit} saving={saving} error={general} saved={saved} />
    </form>
  );
}

// ---- featured courses ----------------------------------------------------------------------------------------------------
function FeaturedForm({ value, canEdit }) {
  const save = useSave("featured");
  const data = useAdmin();
  const [groups, setGroups] = useState(() => value.groups.map((g) => ({ name: g.name, courses: Array.from({ length: MAX_PER_TAB }, (_, i) => (g.courses[i] ? String(g.courses[i]) : "")) })));
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);
  const c = copy.featured;
  if (!data) return null;
  const options = [{ value: "", label: c.none }, ...[...data.catalogue].sort((a, b) => a.title.localeCompare(b.title)).map((x) => ({ value: String(x.id), label: x.title }))];
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
                <FieldSelect id={`rt-adm-fc-${i}-${slot}`} label={c.course.replace("{n}", slot + 1)} value={id} onChange={(v) => setCourse(i, slot, v)} options={options} disabled={!canEdit} invalid={Boolean(errors[`courses${i}`])} describedBy={errors[`courses${i}`] ? `rt-adm-fc-${i}-e` : undefined} />
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

// ---- video story ---------------------------------------------------------------------------------------------------------
function VideoForm({ value, canEdit }) {
  const save = useSave("video");
  const [v, setV] = useState({ author: value.author, position: value.position, quote: value.quote });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);
  const c = copy.video;

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setGeneral("");
    const found = {};
    if (v.author.trim().length < 2) found.author = "Enter the name.";
    if (v.quote.trim().length < 5) found.quote = "Enter the quote.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    setSaving(true);
    try {
      await save({ author: v.author.trim(), position: v.position.trim(), quote: v.quote.trim() });
      setSaved(true);
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
      {field("rt-adm-vs-author", c.fields.author, "", errors.author, <input id="rt-adm-vs-author" type="text" maxLength={60} value={v.author} readOnly={!canEdit} onChange={(e) => setV((x) => ({ ...x, author: e.target.value }))} aria-invalid={errors.author ? true : undefined} aria-describedby={describedBy("rt-adm-vs-author", "", errors.author)} />)}
      {field("rt-adm-vs-position", c.fields.position, "", errors.position, <input id="rt-adm-vs-position" type="text" maxLength={120} value={v.position} readOnly={!canEdit} onChange={(e) => setV((x) => ({ ...x, position: e.target.value }))} />)}
      {field("rt-adm-vs-quote", c.fields.quote, "", errors.quote, <textarea id="rt-adm-vs-quote" rows={3} maxLength={200} value={v.quote} readOnly={!canEdit} onChange={(e) => setV((x) => ({ ...x, quote: e.target.value }))} aria-invalid={errors.quote ? true : undefined} aria-describedby={describedBy("rt-adm-vs-quote", "", errors.quote)} />)}
      <SaveRow canEdit={canEdit} saving={saving} error={general} saved={saved} />
    </form>
  );
}

// ---- testimonials --------------------------------------------------------------------------------------------------------
function Testimonials({ value, canEdit }) {
  const save = useSave("testimonials");
  const c = copy.testimonials;
  const [list, setList] = useState(value);
  const [editing, setEditing] = useState(null); // a testimonial (new or existing) in the pop-up
  const [removing, setRemoving] = useState(null);
  const [said, setSaid] = useState("");
  const [error, setError] = useState("");
  const homeCount = list.filter((t) => t.home).length;

  // every change is saved at once (the whole list), so the page and the site never differ
  const commit = async (next) => {
    setError("");
    setSaid("");
    try {
      await save(next);
      setList(next);
      setSaid(copy.saved);
      return true;
    } catch (err) {
      setError(errorsFrom(err).general);
      return false;
    }
  };

  return (
    <div className="rt-acc__stack">
      <p className="rt-acc__note rt-adm-help">{c.note}</p>
      {error && <p className="rt-q__err rt-acc__formerr" role="alert">{error}</p>}
      <p className="rt-sr" role="status">{said}</p>
      <section className="rt-acc__card" aria-labelledby="rt-adm-tm-h">
        <div className="rt-acc__cardhead">
          <h2 className="rt-acc__h2" id="rt-adm-tm-h">{c.title} <span className="rt-adm-muted">{list.length}</span></h2>
          {canEdit && <button type="button" className="button -sm -purple-1 text-white" onClick={() => setEditing({ id: "", author: "", position: "", text: "", source: "", home: false })}>{c.add}</button>}
        </div>
        {canEdit && homeCount >= 4 && <p className="rt-acc__note rt-adm-content__max">{c.maxHome}</p>}
        <ul className="rt-adm-list rt-adm-tm">
          {list.map((t) => (
            <li key={t.id}>
              <div>
                <span className="rt-adm-strong">{t.author}</span>
                <small>{t.position}{t.source ? ` · ${t.source}` : ""}</small>
                <p className="rt-adm-tm__text">{t.text}</p>
              </div>
              <div className="rt-adm-tm__side">
                <label className="rt-bk__check" htmlFor={`rt-adm-tm-home-${t.id}`}>
                  <input id={`rt-adm-tm-home-${t.id}`} type="checkbox" checked={t.home} disabled={!canEdit || (!t.home && homeCount >= 4)} onChange={(e) => commit(list.map((x) => (x.id === t.id ? { ...x, home: e.target.checked } : x)))} />
                  <span>{c.home}</span>
                </label>
                {canEdit && (
                  <div className="rt-adm-tm__buttons">
                    <button type="button" className="rt-cd__link" onClick={() => setEditing(t)}>{c.edit}<span className="rt-sr"> {t.author}</span></button>
                    <button type="button" className="rt-cd__link rt-adm-danger" onClick={() => setRemoving(t)}>{c.remove}<span className="rt-sr"> {t.author}</span></button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <TestimonialSheet item={editing} onClose={() => setEditing(null)} onSave={async (t) => {
        const next = t.id ? list.map((x) => (x.id === t.id ? t : x)) : [...list, { ...t, id: `t${Date.now().toString(36)}` }];
        const ok = await commit(next);
        if (ok) setEditing(null);
        return ok;
      }} homeFull={homeCount >= 4} />

      <Sheet open={Boolean(removing)} onClose={() => setRemoving(null)} title={c.removeTitle} closeLabel="Close">
        {removing && (
          <div className="rt-q__form rt-biz__sheetform">
            <p className="rt-adm-strong">{removing.author}<small>{removing.position}</small></p>
            <p className="rt-acc__note">{c.removeText}</p>
            <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={async () => { if (await commit(list.filter((x) => x.id !== removing.id))) setRemoving(null); }}>{c.remove}</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function TestimonialSheet({ item, onClose, onSave, homeFull }) {
  const c = copy.testimonials;
  const [v, setV] = useState(null);
  const [errors, setErrors] = useState({});
  const [opened, setOpened] = useState(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  if (item !== opened) {
    setOpened(item);
    setV(item ? { ...item } : null);
    setErrors({});
  }
  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (v.author.trim().length < 2) found.author = "Enter the name.";
    if (v.text.trim().length < 10) found.text = "Enter what they said, at least 10 characters.";
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    setBusy(true);
    await onSave({ ...v, author: v.author.trim(), position: v.position.trim(), text: v.text.trim() });
    setBusy(false);
  };
  const f = c.form;
  return (
    <Sheet open={Boolean(item)} onClose={onClose} title={item?.id ? `${c.edit}: ${item.author}` : c.add} closeLabel="Close">
      {v && (
        <form className="rt-q__form rt-biz__sheetform" onSubmit={submit} noValidate ref={ref}>
          {field("rt-adm-tf-author", f.author, "", errors.author, <input id="rt-adm-tf-author" type="text" maxLength={60} autoComplete="off" value={v.author} onChange={(e) => setV((x) => ({ ...x, author: e.target.value }))} aria-invalid={errors.author ? true : undefined} aria-describedby={describedBy("rt-adm-tf-author", "", errors.author)} />)}
          {field("rt-adm-tf-position", f.position, f.positionHint, "", <input id="rt-adm-tf-position" type="text" maxLength={120} autoComplete="off" value={v.position} onChange={(e) => setV((x) => ({ ...x, position: e.target.value }))} aria-describedby="rt-adm-tf-position-hint" />)}
          {field("rt-adm-tf-text", f.text, "", errors.text, <textarea id="rt-adm-tf-text" rows={5} maxLength={800} value={v.text} onChange={(e) => setV((x) => ({ ...x, text: e.target.value }))} aria-invalid={errors.text ? true : undefined} aria-describedby={describedBy("rt-adm-tf-text", "", errors.text)} />)}
          <div className="rt-field">
            <label htmlFor="rt-adm-tf-source">{f.source}</label>
            <FieldSelect id="rt-adm-tf-source" label={f.source} value={v.source} onChange={(s) => setV((x) => ({ ...x, source: s }))} options={Object.entries(c.sources).map(([value, label]) => ({ value, label }))} />
          </div>
          <label className="rt-bk__check" htmlFor="rt-adm-tf-home">
            <input id="rt-adm-tf-home" type="checkbox" checked={v.home} disabled={!v.home && homeFull && !item?.home} onChange={(e) => setV((x) => ({ ...x, home: e.target.checked }))} />
            <span>{c.home}</span>
          </label>
          <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy}>{f.save}</button>
        </form>
      )}
    </Sheet>
  );
}
