"use client";

import React, { useState } from "react";
import { refreshSiteContent } from "@/app/admin/actions";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";
import { formatWhen } from "./adminParts";

const copy = A.content;

// One piece of content's save: the mutation, then the lists read again and (for what the website shows, not an email's words)
// the site's copy marked out of date.
export function useSave(key, { site = true } = {}) {
  const utils = api.useUtils();
  const save = api.content.save.useMutation();
  return async (value) => {
    await save.mutateAsync({ key, value });
    await utils.content.invalidate();
    utils.admin.activity.list.invalidate();
    if (site) await refreshSiteContent();
  };
}

// A form's footer: the general error, the Save button (when allowed) and a confirmation line.
export function SaveRow({ canEdit, saving, error, saved }) {
  return (
    <div className="rt-adm-content__save">
      {error && <p className="rt-q__err rt-acc__formerr" role="alert">{error}</p>}
      {canEdit && <button type="submit" className="button -md -purple-1 text-white" disabled={saving}>{copy.save}</button>}
      <p className="rt-acc__note" role="status">{saved ? copy.saved : ""}</p>
    </div>
  );
}

// A label, its hint, its error above the field, then the field (the GOV.UK way); `describedBy` links them for screen readers.
export const field = (id, label, hint, error, input) => (
  <div className="rt-field">
    <label htmlFor={id}>{label}</label>
    {hint && <small className="rt-field__hint" id={`${id}-hint`}>{hint}</small>}
    {error && <p className="rt-q__err" id={`${id}-e`}><span className="rt-sr">Error: </span>{error}</p>}
    {input}
  </div>
);
export const describedBy = (id, hint, error) => [hint && `${id}-hint`, error && `${id}-e`].filter(Boolean).join(" ") || undefined;

// A short stable id for a row in a list that can be reordered
let rowId = 0;
export const newRowId = () => `r${++rowId}`;

// The saved versions of one piece of content, newest first (who and when): look at the list, and with the "content" switch bring
// one back into the form (it is only live once it is saved again).
export function History({ contentKey, canEdit, onUse }) {
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
