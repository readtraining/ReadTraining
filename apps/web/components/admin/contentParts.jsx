"use client";

import React from "react";
import { refreshSiteContent } from "@/app/admin/actions";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";

const copy = A.content;

// One piece of content's save: the mutation, then the lists read again and the site's copy marked out of date.
export function useSave(key) {
  const utils = api.useUtils();
  const save = api.content.save.useMutation();
  return async (value) => {
    await save.mutateAsync({ key, value });
    await utils.content.invalidate();
    utils.admin.activity.list.invalidate();
    await refreshSiteContent();
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
