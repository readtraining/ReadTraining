"use client";

import React, { useRef, useState } from "react";
import { ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { contentDefaults } from "@/data/home";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { SITE_URL } from "@/lib/seo";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { Pill, TableSkeleton } from "./adminParts";
import { SaveRow, describedBy, field, useSave } from "./contentParts";

const copy = A.platform;
const LIMITS = { homeTitle: [10, 70], homeDescription: [50, 160], siteDescription: [50, 160] };

// Platform settings (Part B, B3): the search-engine words (content key `seo`, saved with the "platform.settings" switch; the root
// layout and the homepage read them), with a search-result preview; and which outside services are connected (API
// admin.platform.services: only whether each setting is there, never its value).
export default function AdminPlatform() {
  const site = api.content.site.useQuery();
  const services = api.admin.platform.services.useQuery();
  if (site.isLoading || services.isLoading) return <TableSkeleton rows={5} />;
  if (site.error || services.error) return <ErrorState onRetry={() => { site.refetch(); services.refetch(); }} />;
  return (
    <div className="rt-acc__stack">
      <SeoForm value={site.data.seo ?? contentDefaults.seo} />
      <Services list={services.data} />
    </div>
  );
}

function SeoForm({ value }) {
  const me = useAdminAccess();
  const canEdit = me?.permissions?.includes("platform.settings");
  const save = useSave("seo");
  const [v, setV] = useState(value);
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);
  const c = copy.seo;

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setGeneral("");
    const found = {};
    for (const [k, [min, max]] of Object.entries(LIMITS)) {
      const n = v[k].trim().length;
      if (n < min || n > max) found[k] = `Use ${min} to ${max} characters (now ${n}).`;
    }
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(ref.current);
    setSaving(true);
    try {
      await save({ homeTitle: v.homeTitle.trim(), homeDescription: v.homeDescription.trim(), siteDescription: v.siteDescription.trim() });
      setSaved(true);
    } catch (err) {
      const { fields, general: g } = errorsFrom(err);
      setErrors(fields);
      setGeneral(g);
      if (Object.keys(fields).length) focusFirstError(ref.current);
    }
    setSaving(false);
  };

  return (
    <form className="rt-acc__card" onSubmit={submit} noValidate ref={ref} aria-labelledby="rt-adm-seo-h">
      <h2 className="rt-acc__h2" id="rt-adm-seo-h">{c.title}</h2>
      <p className="rt-acc__note">{c.note}</p>
      {!canEdit && <p className="rt-acc__notice rt-adm-mt">{c.readOnly}</p>}
      <div className="rt-adm-seo">
        <div>
          {Object.entries(c.fields).map(([k, f]) => {
            const id = `rt-adm-seo-${k}`;
            const n = v[k].trim().length;
            const props = { id, value: v[k], readOnly: !canEdit, onChange: (e) => setV((x) => ({ ...x, [k]: e.target.value })), "aria-invalid": errors[k] ? true : undefined, "aria-describedby": describedBy(id, f.hint, errors[k]) };
            return (
              <div key={k} className="rt-adm-seo__field">
                {field(id, f.label, f.hint, errors[k], k === "homeTitle" ? <input type="text" {...props} /> : <textarea rows={3} {...props} />)}
                <small className={`rt-adm-seo__count${n > LIMITS[k][1] ? " -over" : ""}`} aria-hidden="true">{c.counter.replace("{n}", n).replace("{max}", LIMITS[k][1])}</small>
              </div>
            );
          })}
        </div>
        <div className="rt-adm-seo__preview" aria-label={c.preview}>
          <p className="rt-adm-strong">{c.preview}</p>
          <div className="rt-adm-serp">
            <span className="rt-adm-serp__url">{SITE_URL.replace(/^https?:\/\//, "")}</span>
            <span className="rt-adm-serp__title">{v.homeTitle.trim() || "…"}</span>
            <span className="rt-adm-serp__text">{v.homeDescription.trim() || "…"}</span>
          </div>
        </div>
      </div>
      <SaveRow canEdit={canEdit} saving={saving} error={general} saved={saved} />
    </form>
  );
}

function Services({ list }) {
  const c = copy.services;
  return (
    <section className="rt-acc__card" aria-labelledby="rt-adm-svc-h">
      <h2 className="rt-acc__h2" id="rt-adm-svc-h">{c.title}</h2>
      <p className="rt-acc__note">{c.note}</p>
      <ul className="rt-adm-svc">
        {list.map((s) => (
          <li key={s.key}>
            <div>
              <p className="rt-adm-strong">{s.name}</p>
              <p className="rt-acc__note">{s.purpose}</p>
              <small>{s.used === "now" ? c.now : c.later}</small>
              {!s.connected && <small className="rt-adm-svc__vars">{c.settings} {s.missing.map((m) => <code key={m}>{m}</code>)}</small>}
            </div>
            <Pill tone={s.connected ? "ok" : s.used === "now" ? "late" : "muted"}>{s.connected ? c.connected : c.missing}</Pill>
          </li>
        ))}
      </ul>
    </section>
  );
}
