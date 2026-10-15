"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import FilterScrollPill from "@/components/courses/FilterScrollPill";
import { admin as A } from "@/data/admin";
import { useAdmin } from "@/lib/admin";

const initials = (name) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// The admin's layout: a work layout, not the public site's. The checkout header's dark band with the logo and an "Admin" tag, the
// signed-in staff member and "View site"; a sidebar with the plan's groups (each page with its icon and a live count where
// something waits); then the page head (title, intro, the page's actions) and the page. Below 992px the
// sidebar becomes the account's chip row that scrolls sideways. `current` marks the page.
export default function AdminShell({ current, title, lead, actions = null, children }) {
  const sideRef = useRef(null);
  const data = useAdmin();
  const counts = data?.counts || {};
  const items = A.nav.flatMap((g) => g.items);

  return (
    <div className="rt-home rt-adm">
      <a href="#rt-adm-main" className="rt-skip">Skip to main content</a>
      <header className="rt-adm__top">
        <div className="rt-adm__toprow">
          <Link href="/admin" className="rt-adm__logo" aria-label={`${A.title} dashboard`}>
            <Image width={150} height={38} src="/assets/img/general/readtraining-logo.svg" alt="" priority />
            <span className="rt-adm__tag">Admin</span>
          </Link>
          <div className="rt-adm__topside">
            <Link href={A.backToSite.href} className="rt-adm__site">{A.backToSite.label}<i className="icon-arrow-top-right text-12" aria-hidden="true"></i></Link>
            <div className="rt-adm__me">
              <span className="rt-acc__avatar" aria-hidden="true">{initials(A.staff.name)}</span>
              <span className="rt-adm__mewho"><strong>{A.staff.name}</strong><span>{A.staff.role}</span></span>
            </div>
          </div>
        </div>
      </header>

      <div className="rt-adm__body">
        <nav className="rt-adm__side rt-pill-scroll" aria-label="Admin" ref={sideRef}>
          {A.nav.map((g) => (
            <div key={g.group} className="rt-adm__group">
              <p className="rt-adm__grouplabel">{g.group}</p>
              <ul>
                {g.items.map((x) => (
                  <li key={x.key}>
                    <Link href={x.href} className={`rt-adm__link${x.key === current ? " is-active" : ""}`} aria-current={x.key === current ? "page" : undefined}>
                      <i className={`${x.icon} text-16`} aria-hidden="true"></i>
                      <span>{x.label}</span>
                      {x.badge && counts[x.badge] > 0 && <span className="rt-adm__count" aria-label={`${counts[x.badge]} waiting`}>{counts[x.badge]}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <FilterScrollPill scrollRef={sideRef} />
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

        <main id="rt-adm-main" className="rt-adm__main" tabIndex={-1}>
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
