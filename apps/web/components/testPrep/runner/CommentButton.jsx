"use client";

import React, { useState } from "react";
import Sheet from "./Sheet";
import { testPrepPage } from "@/data/testPrep";
import { submitComment } from "@/lib/comments";
import { focusFirstError } from "@/lib/focusFirstError";

// "Leave a comment" (as on the reference, hurak.com): a button that opens the runner's pop-up (Sheet) with name, email (optional,
// for a reply) and the comment. It checks the comment, sends through lib/comments.js (simulated until the endpoint exists) and
// thanks the reader. The form reuses the reviews form's styles and the site's form fields (.rt-field).
const MIN_TEXT = 10;

function CommentForm({ subject, test, onDone }) {
  const c = testPrepPage.comments;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | failed

  const submit = async (e) => {
    e.preventDefault();
    if (text.trim().length < MIN_TEXT) {
      setError(c.errors.text);
      return focusFirstError(e.currentTarget);
    }
    setStatus("sending");
    try {
      await submitComment({ subject, test, name: name.trim(), email: email.trim(), text: text.trim() });
      onDone();
    } catch {
      setStatus("failed");
    }
  };

  return (
    <form className="rt-tps__rvform" onSubmit={submit} noValidate>
      <p className="rt-tq__dlg-text">{c.intro}</p>
      <label className="rt-field">
        <span>{c.nameLabel}</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} />
      </label>
      <label className="rt-field">
        <span>{c.emailLabel}</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={120} />
      </label>
      <div className="rt-field">
        <label htmlFor="rt-cm-text">{c.textLabel}</label>
        {error && <p className="rt-q__err" id="rt-cm-text-err"><span className="rt-sr">Error: </span>{error}</p>}
        <textarea id="rt-cm-text" value={text} onChange={(e) => { setText(e.target.value); if (error && e.target.value.trim().length >= MIN_TEXT) setError(""); }} placeholder={c.textPlaceholder} maxLength={1000} aria-invalid={error ? "true" : undefined} aria-describedby={error ? "rt-cm-text-err" : undefined}></textarea>
      </div>
      {status === "failed" && <p className="rt-q__err" role="alert">{c.failed}</p>}
      <button type="submit" className="button -md -purple-1 text-white rt-btn-block" disabled={status === "sending"}>
        {status === "sending" ? c.sending : c.submit}
      </button>
    </form>
  );
}

export default function CommentButton({ subject, test, className = "button -md -outline-purple-1 text-purple-1" }) {
  const c = testPrepPage.comments;
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <>
      <button type="button" className={className} aria-haspopup="dialog" onClick={() => { setSent(false); setOpen(true); }}>{c.cta}</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={sent ? c.thanksTitle : c.formTitle} closeLabel={c.close} className="rt-tps__rvsheet">
        {sent ? (
          <div className="rt-tps__rvthanks" role="status">
            <span className="rt-tps__rvthanks-icon" aria-hidden="true"><i className="icon-check"></i></span>
            <p>{c.thanksText}</p>
            <button type="button" className="button -md -purple-1 text-white rt-btn-block" onClick={() => setOpen(false)}>{c.close}</button>
          </div>
        ) : (
          <CommentForm subject={subject} test={test} onDone={() => setSent(true)} />
        )}
      </Sheet>
    </>
  );
}
