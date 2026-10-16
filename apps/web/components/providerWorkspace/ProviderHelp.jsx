"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getHelpSearchIndex, getHelpTopic } from "@/lib/help";
import { EmptyState } from "@/components/states/States";

// Help: Hurak's three ways to get help (how-to guides, help and support, live chat) in our layout: a search across every help
// article, the provider guides as a list, and the three ways to reach us beside it.
const WAYS = [
  { icon: "icon-play-button", title: "How-to guides", text: "Step by step: listing a course, running cohorts, orders and earnings.", href: "/help-centre/training-providers", cta: "Open the guides" },
  { icon: "icon-document", title: "Help and support", text: "Every help article, from publishing your first course to refunds.", href: "/help-centre", cta: "Visit the help centre" },
  { icon: "icon-message", title: "Live chat", text: "Message our provider team, Monday to Friday, 9am to 5pm. We usually reply the same day.", href: "/contact-us", cta: "Contact the team" },
];
const INDEX = getHelpSearchIndex();
const GUIDES = getHelpTopic("training-providers")?.articles || [];

export default function ProviderHelp() {
  const [q, setQ] = useState("");
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = words.length ? INDEX.filter((a) => words.every((w) => `${a.title} ${a.summary} ${a.topic}`.toLowerCase().includes(w))).slice(0, 6) : [];

  return (
    <div className="rt-acc__stack">
      <section className="rt-hp-search" aria-labelledby="rt-hp-h">
        <h2 className="rt-hp-search__title" id="rt-hp-h">How can we help?</h2>
        <div className="rt-hp-search__box" role="search">
          <i className="icon-search text-16" aria-hidden="true"></i>
          <label htmlFor="rt-hp-q" className="rt-sr">Search help articles</label>
          <input id="rt-hp-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for refunds, payouts, cohorts…" autoComplete="off" aria-describedby="rt-hp-n" />
        </div>
        <p className="rt-sr" id="rt-hp-n" aria-live="polite">{words.length ? `${results.length} ${results.length === 1 ? "article" : "articles"} found` : ""}</p>
        {words.length > 0 && (
          results.length ? (
            <ul className="rt-hp-results">
              {results.map((a) => (
                <li key={a.href}><Link href={a.href}><b>{a.title}</b><small>{a.topic} · {a.summary}</small><i className="icon-arrow-right text-12" aria-hidden="true"></i></Link></li>
              ))}
            </ul>
          ) : <EmptyState inCard title={`No articles match “${q.trim()}”.`} action={{ href: "/contact-us", label: "Ask our provider team" }} />
        )}
      </section>

      <div className="rt-hp-grid">
        <section className="rt-acc__card" aria-labelledby="rt-hp-guides">
          <h2 className="rt-hp-h" id="rt-hp-guides">Guides for providers</h2>
          <ul className="rt-hp-guides">
            {GUIDES.map((a) => (
              <li key={a.slug}>
                <Link href={a.href}>
                  <span className="rt-hp-guides__icon" aria-hidden="true"><i className="icon-document text-14"></i></span>
                  <span><b>{a.title}</b><small>{a.summary}</small></span>
                  <i className="icon-chevron-right text-10" aria-hidden="true"></i>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="rt-hp-ways">
          <h2 className="rt-hp-h" id="rt-hp-ways">Get help</h2>
          <ul className="rt-hp-ways">
            {WAYS.map((w) => (
              <li key={w.title} className="rt-acc__card">
                <span className="rt-hp-ways__icon" aria-hidden="true"><i className={`${w.icon} text-18`}></i></span>
                <div>
                  <h3 className="rt-hp-ways__title">{w.title}</h3>
                  <p className="rt-acc__note">{w.text}</p>
                  <Link href={w.href} className="rt-cd__link">{w.cta}<span className="rt-sr">: {w.title}</span></Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
