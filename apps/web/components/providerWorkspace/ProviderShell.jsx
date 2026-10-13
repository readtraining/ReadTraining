"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { pw } from "@/data/providerWorkspace";
import { useProvider } from "@/lib/providerWorkspace";

const initials = (name) => name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// The provider workspace's layout: the same work layout as the admin (DESIGN-SYSTEM.md, "Provider workspace follows the same
// shell pattern"). A dark band with the logo, a "Provider" tag and the organisation, "Help centre", "View site" and the signed-in
// person; a grouped sidebar with live counts (reviews to answer, refund requests, unread notifications), which becomes the
// scrolling chip row below 992px; then the page head (title, intro, the page's actions) and the page. `current` marks the page.
export default function ProviderShell({ current, title, lead, actions = null, back = null, children }) {
  const data = useProvider();
  const counts = data?.counts || {};
  const items = pw.nav.flatMap((g) => g.items);
  const org = data?.org.name || "";

  return (
    <div className="rt-home rt-adm rt-pws">
      <a href="#rt-pws-main" className="rt-skip">Skip to main content</a>
      <header className="rt-adm__top">
        <div className="rt-adm__toprow">
          <Link href="/provider" className="rt-adm__logo" aria-label={`${pw.title} dashboard`}>
            <Image width={150} height={38} src="/assets/img/general/readtraining-logo.svg" alt="" priority />
            <span className="rt-adm__tag">{pw.tag}</span>
          </Link>
          <div className="rt-adm__topside">
            <Link href={pw.help.href} className="rt-adm__site">{pw.help.label}</Link>
            <Link href={pw.backToSite.href} className="rt-adm__site">{pw.backToSite.label}<i className="icon-arrow-top-right text-12" aria-hidden="true"></i></Link>
            {data && (
              <div className="rt-adm__me">
                <span className="rt-acc__avatar" aria-hidden="true">{initials(data.me.name)}</span>
                <span className="rt-adm__mewho"><strong>{data.me.name}</strong><span>{data.me.role}</span></span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="rt-adm__body">
        <nav className="rt-adm__side" aria-label="Provider workspace">
          <div className="rt-pws__org">
            <span className="rt-pws__orgmark" aria-hidden="true">{org ? initials(org) : ""}</span>
            <span className="rt-pws__orgname"><strong>{org || " "}</strong><span>Training provider</span></span>
          </div>
          {pw.nav.map((g) => (
            <div key={g.group} className="rt-adm__group">
              <p className="rt-adm__grouplabel">{g.group}</p>
              <ul>
                {g.items.map((x) => (
                  <li key={x.key}>
                    <Link href={x.href} className={`rt-adm__link${x.key === current ? " is-active" : ""}`} aria-current={x.key === current ? "page" : undefined}>
                      <i className={`${x.icon} text-16`} aria-hidden="true"></i>
                      <span>{x.label}</span>
                      {x.badge && counts[x.badge] > 0 && <span className="rt-adm__count" aria-label={`${counts[x.badge]} new`}>{counts[x.badge]}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="rt-adm__group">
            <p className="rt-adm__grouplabel">Your account</p>
            <ul>
              <li><Link href="/account" className="rt-adm__link"><i className="icon-person text-16" aria-hidden="true"></i><span>Switch to learner account</span></Link></li>
            </ul>
          </div>
        </nav>
        <ul className="rt-acc__chips rt-adm__chips">
          {items.map((x) => (
            <li key={x.key}>
              <Link href={x.href} className={`rt-tr__filter${x.key === current ? " is-on" : ""}`} aria-current={x.key === current ? "page" : undefined}>
                {x.label}
                {x.badge && counts[x.badge] > 0 && <span className="rt-tr__filter-n">{counts[x.badge]}</span>}
              </Link>
            </li>
          ))}
        </ul>

        <main id="rt-pws-main" className="rt-adm__main" tabIndex={-1}>
          {back && <Link href={back.href} className="fb-textlink rt-adm-back rt-pws__back"><i className="icon-arrow-left text-12" aria-hidden="true"></i>{back.label}</Link>}
          <div className="rt-adm__head">
            <div>
              <h1 className="rt-adm__h1">{title}</h1>
              {lead && <p className="rt-adm__lead">{lead}</p>}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
