"use client";

import React, { useEffect, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import { EmptyState, ErrorState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { focusFirstError } from "@/lib/focusFirstError";
import { api } from "@/lib/trpc/react";
import { errorsFrom } from "@/lib/useMe";
import { DetailSkeleton, Said, formatWhen } from "./adminParts";
import { History, describedBy, field, useSave } from "./contentParts";
import { AdminStatus, AdminTag } from "./AdminStatus";

const copy = A.emails;
const FIELDS = ["subject", "heading", "body", "button"];

// One automated email (API admin.emails.get): its words beside a live preview with example details (admin.emails.preview).
// With the "content" switch an admin saves the words (content key email:<template>, kept in Earlier versions), sends a test to
// their own address, or goes back to the built-in wording. Placeholders are listed and added to the message with a click; the
// ones the email needs (the team's note) must stay.
export default function AdminEmail({ templateKey }) {
  const me = useAdminAccess();
  const canEdit = me?.permissions?.includes("content");
  const record = api.admin.emails.get.useQuery({ key: templateKey }, { retry: false });
  const changes = api.content.changes.useQuery();
  const [loaded, setLoaded] = useState(0); // a reset or an earlier version starts the form again
  const [words, setWords] = useState(null);
  const [note, setNote] = useState(""); // the confirmation for a restart (the editor starts again, so it can't keep its own)
  useEffect(() => {
    if (record.data && !words) setWords(record.data.saved ?? record.data.builtIn);
  }, [record.data, words]);

  if (record.isLoading || (record.data && !words)) return <DetailSkeleton />;
  if (record.error?.data?.code === "NOT_FOUND") return <EmptyState title={copy.notFound} action={{ href: "/admin/emails", label: copy.back }} />;
  if (record.error) return <ErrorState onRetry={() => record.refetch()} />;
  const when = changes.data?.[`email:${templateKey}`];
  return (
    <Editor
      key={loaded}
      t={record.data}
      initial={words}
      canEdit={canEdit}
      when={when}
      note={note}
      onRestart={(w, message = "") => {
        setWords(w);
        setNote(message);
        setLoaded((n) => n + 1);
      }}
    />
  );
}

function Editor({ t, initial, canEdit, when, note, onRestart }) {
  const contentKey = `email:${t.key}`;
  const save = useSave(contentKey, { site: false });
  const utils = api.useUtils();
  const reset = api.content.reset.useMutation();
  const test = api.admin.emails.sendTest.useMutation();
  const [w, setW] = useState(initial);
  const [shown, setShown] = useState(initial); // what the preview shows: the words a moment after typing stops
  const [errors, setErrors] = useState({});
  const [said, setSaid] = useState(note);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef(null);
  const bodyRef = useRef(null);
  useEffect(() => {
    const id = setTimeout(() => setShown(w), 400);
    return () => clearTimeout(id);
  }, [w]);
  const preview = api.admin.emails.preview.useQuery({ key: t.key, words: shown }, { placeholderData: (prev) => prev, retry: false });

  const set = (k) => (e) => setW((x) => ({ ...x, [k]: e.target.value }));
  const insert = (p) => {
    const el = bodyRef.current;
    const token = `{${p}}`;
    const at = el && document.activeElement === el ? el.selectionStart : w.body.length;
    const end = el && document.activeElement === el ? el.selectionEnd : w.body.length;
    setW((x) => ({ ...x, body: x.body.slice(0, at) + token + x.body.slice(end) }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };
  const fail = (err) => {
    const { fields, general } = errorsFrom(err);
    setErrors(fields);
    if (Object.keys(fields).length) focusFirstError(formRef.current);
    else setSaid(general);
  };
  const submit = async (e) => {
    e.preventDefault();
    setSaid("");
    const found = {};
    for (const k of FIELDS) if (k !== "button" || t.hasButton) if (!w[k].trim()) found[k] = `Enter the ${copy.fields[k].label.toLowerCase()}.`;
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(formRef.current);
    setBusy(true);
    try {
      await save({ ...w, button: t.hasButton ? w.button : "" });
      await utils.admin.emails.invalidate();
      setSaid(copy.saved);
    } catch (err) {
      fail(err);
    }
    setBusy(false);
  };
  const sendTest = async () => {
    setSaid("");
    setErrors({});
    try {
      const r = await test.mutateAsync({ key: t.key, words: { ...w, button: t.hasButton ? w.button : "" } });
      setSaid(copy.testSent.replace("{email}", r.to));
    } catch (err) {
      fail(err);
    }
  };
  const doReset = async () => {
    try {
      await reset.mutateAsync({ key: contentKey });
      await Promise.all([utils.content.invalidate(), utils.admin.emails.invalidate()]);
      utils.admin.activity.list.invalidate();
      setConfirming(false);
      onRestart(t.builtIn, copy.resetDone);
    } catch (err) {
      setConfirming(false);
      fail(err);
    }
  };

  return (
    <div className="rt-acc__stack">
      <Said text={said} />
      <section className="rt-acc__card rt-adm-hero" aria-label="Email">
        <div>
          <div className="rt-adm-item__top">
            {t.status === "live" ? <AdminStatus kind="email" status="live">{copy.statuses[t.status]}</AdminStatus> : <AdminTag>{copy.statuses[t.status]}</AdminTag>}
            <span className="rt-adm-item__when">{t.audience}</span>
          </div>
          <h1 className="rt-adm__h1 rt-adm-hero__name">{t.name}</h1>
          <p className="rt-acc__note">{t.trigger}{t.status === "later" ? ` ${copy.statusNotes.later}` : ""}</p>
        </div>
        <p className="rt-acc__note">{when ? `${copy.changed} ${formatWhen(Date.parse(when.at))}${when.by ? ` by ${when.by}` : ""}` : copy.builtIn}</p>
      </section>
      {!canEdit && <p className="rt-acc__notice">{copy.readOnly}</p>}

      <div className="rt-adm-email">
        <form className="rt-acc__card rt-adm-email__form" onSubmit={submit} noValidate ref={formRef}>
          {FIELDS.filter((k) => k !== "button" || t.hasButton).map((k) => {
            const id = `rt-adm-em-${k}`;
            const f = copy.fields[k];
            const props = { id, value: w[k], onChange: set(k), readOnly: !canEdit, "aria-invalid": errors[k] ? true : undefined, "aria-describedby": describedBy(id, f.hint, errors[k]) };
            return <React.Fragment key={k}>{field(id, f.label, f.hint, errors[k], k === "body" ? <textarea {...props} rows={12} ref={bodyRef} /> : <input type="text" {...props} />)}</React.Fragment>;
          })}
          {t.placeholders.length > 0 && (
            <div className="rt-adm-email__ph">
              <p className="rt-adm-strong">{copy.placeholders}</p>
              <p className="rt-acc__note">{copy.placeholdersHint}</p>
              <ul>
                {t.placeholders.map((p) => (
                  <li key={p}>
                    <button type="button" className="rt-adm-email__token" onClick={() => insert(p)} disabled={!canEdit}>{`{${p}}`}</button>
                    {t.required.includes(p) && <small>{copy.required}</small>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {canEdit && (
            <div className="rt-acc__actions">
              <button type="submit" className="button -md -purple-1 text-white" disabled={busy}>{copy.save}</button>
              <button type="button" className="button -md -outline-purple-1 text-purple-1" onClick={sendTest} disabled={test.isPending}>{copy.test}</button>
              {when && <button type="button" className="rt-cd__link" onClick={() => setConfirming(true)}>{copy.reset}</button>}
            </div>
          )}
        </form>

        <section className="rt-acc__card rt-adm-email__preview" aria-labelledby="rt-adm-em-prev-h" aria-busy={preview.isFetching}>
          <h2 className="rt-acc__h2" id="rt-adm-em-prev-h">{copy.preview}</h2>
          <p className="rt-acc__note">{copy.previewNote}</p>
          {preview.error && !preview.data ? (
            <p className="rt-acc__notice">{copy.previewError}</p>
          ) : preview.data ? (
            <>
              {preview.error && <p className="rt-acc__notice">{copy.previewError}</p>}
              <p className="rt-adm-email__subject"><span>{copy.subjectLabel}</span> {preview.data.subject}</p>
              <iframe className="rt-adm-email__frame" title={`${copy.preview}: ${t.name}`} srcDoc={preview.data.html} sandbox="" />
            </>
          ) : (
            <span className="rt-skel rt-adm-email__frame" aria-hidden="true"></span>
          )}
        </section>
      </div>

      <History contentKey={contentKey} canEdit={canEdit} onUse={(v) => onRestart(v.value)} />

      <Sheet open={confirming} onClose={() => setConfirming(false)} title={copy.resetTitle} closeLabel="Close">
        <div className="rt-q__form rt-biz__sheetform">
          <p className="rt-adm-strong">{t.name}</p>
          <p className="rt-acc__note">{copy.resetText}</p>
          <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={doReset} disabled={reset.isPending}>{copy.reset}</button>
        </div>
      </Sheet>
    </div>
  );
}
