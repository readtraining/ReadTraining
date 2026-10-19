"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { admin as A } from "@/data/admin";
import { api } from "@/lib/trpc/react";
import { useFocusTrap } from "@/lib/useFocusTrap";

const copy = A.search;

// The admin's one search, as big admin tools have it: the top bar's search button, Ctrl+K (⌘K on a Mac) or "/" opens it. Type a
// page's name to jump there, or a learner's or provider's name, email or phone number (real records, API admin.students.list and
// admin.providers.list). Arrow keys move through the results, Enter opens one, Esc closes. `pages` is the sidebar's list.
export default function AdminSearch({ pages }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [at, setAt] = useState(0);
  const panel = useRef(null);
  const input = useRef(null);
  const opener = useRef(null);
  const router = useRouter();
  const id = useId();

  // Ctrl+K / ⌘K anywhere; "/" when not typing in a field
  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target.closest?.("input, textarea, select, [contenteditable=true]");
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) {
      opener.current = document.activeElement;
      setTimeout(() => input.current?.focus(), 0);
    } else {
      setQ("");
      setTerm("");
      opener.current?.focus?.({ preventScroll: true });
    }
  }, [open]);
  // the records are looked up once typing pauses
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useFocusTrap(open, panel, () => setOpen(false));

  const look = term.length >= 2;
  const learners = api.admin.students.list.useQuery({ q: term, limit: 5 }, { enabled: open && look, staleTime: 30000 });
  const providers = api.admin.providers.list.useQuery({ q: term, limit: 5 }, { enabled: open && look, staleTime: 30000 });
  const needle = q.trim().toLowerCase();
  const results = [
    ...pages.filter((p) => !needle || p.label.toLowerCase().includes(needle)).slice(0, needle ? 6 : 8).map((p) => ({ group: copy.pages, key: `p-${p.key}`, label: p.label, href: p.href, icon: p.icon })),
    ...(look ? (providers.data?.providers ?? []).map((p) => ({ group: copy.providers, key: `o-${p.id}`, label: p.name, sub: p.owner?.email || A.providers.statuses[p.status], href: `/admin/providers/${p.slug}`, icon: "icon-person-3" })) : []),
    ...(look ? (learners.data?.students ?? []).map((s) => ({ group: copy.learners, key: `l-${s.id}`, label: s.name, sub: s.email, href: `/admin/learners/${s.id}`, icon: "icon-person" })) : []),
  ];
  const busy = look && (learners.isFetching || providers.isFetching);
  useEffect(() => setAt(0), [q, results.length]);

  const go = (r) => {
    setOpen(false);
    router.push(r.href);
  };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAt((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[at]) { e.preventDefault(); go(results[at]); }
  };
  useEffect(() => {
    panel.current?.querySelector(`#${CSS.escape(`${id}-${at}`)}`)?.scrollIntoView({ block: "nearest" });
  }, [at, id]);

  return (
    <>
      <button type="button" className="rt-adm__find" onClick={() => setOpen(true)} aria-keyshortcuts="Control+K">
        <i className="icon-search text-14" aria-hidden="true"></i>
        <span>{copy.button}</span>
        <kbd aria-hidden="true">Ctrl K</kbd>
      </button>
      {open && createPortal(
        <div className="rt-adm-find" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="rt-adm-find__panel" role="dialog" aria-modal="true" aria-label={copy.title} ref={panel}>
            <div className="rt-adm-find__bar">
              <i className="icon-search text-16" aria-hidden="true"></i>
              <input
                ref={input}
                type="text"
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls={`${id}-list`}
                aria-activedescendant={results[at] ? `${id}-${at}` : undefined}
                aria-autocomplete="list"
                aria-label={copy.title}
                placeholder={copy.placeholder}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                autoComplete="off"
                spellCheck={false}
              />
              <kbd aria-hidden="true">Esc</kbd>
            </div>
            <ul className="rt-adm-find__list" role="listbox" id={`${id}-list`} aria-label={copy.title}>
              {results.map((r, i) => (
                <React.Fragment key={r.key}>
                  {(i === 0 || results[i - 1].group !== r.group) && <li role="presentation" className="rt-adm-find__group">{r.group}</li>}
                  <li id={`${id}-${i}`} role="option" aria-selected={i === at} className={`rt-adm-find__item${i === at ? " is-on" : ""}`} onMouseMove={() => setAt(i)} onClick={() => go(r)}>
                    <i className={`${r.icon} text-16`} aria-hidden="true"></i>
                    <span className="rt-adm-find__label">{r.label}{r.sub && <small>{r.sub}</small>}</span>
                    <i className="icon-arrow-right text-12 rt-adm-find__go" aria-hidden="true"></i>
                  </li>
                </React.Fragment>
              ))}
            </ul>
            <p className="rt-adm-find__foot" role="status">
              {busy ? copy.searching : results.length === 0 ? copy.none : needle.length === 1 ? copy.more : copy.hint}
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
