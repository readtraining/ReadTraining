"use client";

import React, { useEffect, useRef, useState } from "react";
import Sheet from "@/components/testPrep/runner/Sheet";
import TextArea from "@/components/forms/TextArea";
import { EmptyState, ErrorState } from "@/components/states/States";
import { focusFirstError } from "@/lib/focusFirstError";
import { useProviderAccess } from "@/lib/providerAccess";
import { api } from "@/lib/trpc/react";
import { errorText } from "@/lib/useMe";
import { Loading } from "./providerParts";
import { Confirm, Req } from "./settingsForm";

const MOST = 20;

// Settings › FAQs: the provider's own questions and answers about booking and training with them in general (API provider.faqs).
// Adding, editing, moving up or down and removing each save straight away. They show on the public profile and on the
// provider's courses that have their own page (never on a shared course page, which never names a provider).
export function FaqsTab({ say }) {
  const { organisationId, can } = useProviderAccess();
  const saved = api.provider.faqs.list.useQuery({ organisationId });
  if (saved.isError) return <ErrorState inCard onRetry={() => saved.refetch()} />;
  if (!saved.data) return <Loading rows={2} />;
  return <FaqsList initial={saved.data} locked={!can("provider.faqs.edit")} say={say} />;
}

function FaqsList({ initial, locked, say }) {
  const { organisationId } = useProviderAccess();
  const utils = api.useUtils();
  const save = api.provider.faqs.save.useMutation();
  const [faqs, setFaqs] = useState(initial);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = a new one, a number = that FAQ
  const [removing, setRemoving] = useState(null); // { index, name }
  const [error, setError] = useState("");
  const busy = save.isPending;
  // every change saves the whole list at once; the list on screen changes only once it is saved
  const commit = async (next, message, opts) => {
    setError("");
    try {
      const r = await save.mutateAsync({ organisationId, faqs: next });
      utils.provider.faqs.list.setData({ organisationId }, r);
      setFaqs(r);
      if (message) say(message, opts);
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    }
  };
  const move = (i, by) => {
    const next = [...faqs];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    commit(next, "Order saved", { shown: true });
  };
  return (
    <div className="rt-acc__card rt-q__form rt-pws-set__form" aria-busy={busy || undefined}>
      <div className="rt-acc__cardhead">
        <p className="rt-acc__note">{faqs.length >= MOST && !locked ? `That's the most you can have (${MOST}).` : "Learners see them on your public profile and on your courses that have their own page."}</p>
        {!locked && <button type="button" className="button -sm -outline-purple-1 text-purple-1" onClick={() => setEditing(null)} disabled={busy || faqs.length >= MOST}>Add FAQ</button>}
      </div>
      {faqs.length ? (
        <ul className="rt-adm-list">
          {faqs.map((f, i) => (
            <li key={`${f.question}-${i}`}>
              <div><b>{f.question}</b><small>{f.answer}</small></div>
              {!locked && (
                <div className="rt-adm-list__side">
                  <button type="button" className="rt-pws-ce__iconbtn" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`Move up: ${f.question}`} title="Move up"><i className="icon-chevron-up text-12" aria-hidden="true"></i></button>
                  <button type="button" className="rt-pws-ce__iconbtn" onClick={() => move(i, 1)} disabled={busy || i === faqs.length - 1} aria-label={`Move down: ${f.question}`} title="Move down"><i className="icon-chevron-down text-12" aria-hidden="true"></i></button>
                  <button type="button" className="rt-pws-ce__iconbtn" onClick={() => setEditing(i)} disabled={busy} aria-label={`Edit: ${f.question}`} title="Edit"><i className="icon-edit text-14" aria-hidden="true"></i></button>
                  <button type="button" className="rt-pws-ce__iconbtn -danger" onClick={() => setRemoving({ index: i, name: f.question })} disabled={busy} aria-haspopup="dialog" aria-label={`Remove: ${f.question}`} title="Remove"><i className="icon-bin text-14" aria-hidden="true"></i></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : <EmptyState inCard title="No FAQs yet" />}
      {error && <p className="rt-q__err" role="alert">{error}</p>}
      <FaqSheet open={editing !== undefined} onClose={() => setEditing(undefined)} faq={typeof editing === "number" ? faqs[editing] : null} busy={busy} onSave={async (f) => {
        const isNew = typeof editing !== "number";
        const next = isNew ? [...faqs, f] : faqs.map((x, i) => (i === editing ? f : x));
        if (await commit(next, isNew ? "FAQ added" : "FAQ updated")) setEditing(undefined);
      }} />
      <Confirm danger open={Boolean(removing)} onClose={() => setRemoving(null)} title="Remove this question?" text={removing ? `“${removing.name}” comes off your FAQs straight away.` : ""} confirmLabel="Remove question" busy={busy}
        onConfirm={async () => { if (await commit(faqs.filter((_, i) => i !== removing.index), "FAQ removed")) setRemoving(null); }} />
    </div>
  );
}

function FaqSheet({ open, onClose, faq, onSave, busy }) {
  const [f, setF] = useState({ question: "", answer: "" });
  const [errors, setErrors] = useState({});
  const ref = useRef(null);
  useEffect(() => {
    if (open) {
      setF(faq ? { ...faq } : { question: "", answer: "" });
      setErrors({});
    }
  }, [open, faq]);
  const typed = JSON.stringify(f) !== JSON.stringify(faq ? { ...faq } : { question: "", answer: "" });
  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!f.question.trim()) err.q = "Enter the question.";
    if (!f.answer.trim()) err.a = "Enter the answer.";
    setErrors(err);
    if (Object.keys(err).length) return focusFirstError(ref.current);
    onSave({ question: f.question.trim(), answer: f.answer.trim() });
  };
  return (
    <Sheet open={open} onClose={onClose} title={faq ? "Edit FAQ" : "Add FAQ"} closeLabel="Close" unsaved={typed}>
      <form className="rt-q__form" noValidate onSubmit={submit} ref={ref}>
        <div className="rt-field">
          <label htmlFor="rt-pws-pf-q">Question<Req /></label>
          {errors.q && <p className="rt-q__err" id="rt-pws-pf-q-e"><span className="rt-sr">Error: </span>{errors.q}</p>}
          <input id="rt-pws-pf-q" value={f.question} maxLength={200} onChange={(e) => { setF({ ...f, question: e.target.value }); setErrors((x) => ({ ...x, q: "" })); }} aria-invalid={errors.q ? true : undefined} aria-describedby={errors.q ? "rt-pws-pf-q-e" : undefined} autoComplete="off" />
        </div>
        <div className="rt-field">
          <label htmlFor="rt-pws-pf-a">Answer<Req /></label>
          {errors.a && <p className="rt-q__err" id="rt-pws-pf-a-e"><span className="rt-sr">Error: </span>{errors.a}</p>}
          <TextArea id="rt-pws-pf-a" rows={5} value={f.answer} maxLength={2000} onChange={(e) => { setF({ ...f, answer: e.target.value }); setErrors((x) => ({ ...x, a: "" })); }} aria-invalid={errors.a ? true : undefined} aria-describedby={errors.a ? "rt-pws-pf-a-e" : undefined} autoComplete="off" />
        </div>
        <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={busy} aria-busy={busy || undefined}>{busy ? "Saving…" : faq ? "Update FAQ" : "Add FAQ"}</button>
      </form>
    </Sheet>
  );
}
