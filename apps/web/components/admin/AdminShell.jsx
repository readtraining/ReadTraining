"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FilterScrollPill from "@/components/courses/FilterScrollPill";
import AdminSearch from "./AdminSearch";
import { admin as A } from "@/data/admin";
import { useAdmin } from "@/lib/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { api } from "@/lib/trpc/react";
import { actAsAdmin } from "@/lib/adminStore";
import { AUTH_ROUTES } from "@/lib/routes";
import { getSupabase } from "@/lib/supabase/client";

const initials = (name = "") => name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// The admin's layout: a work layout, not the public site's. The checkout header's dark band with the logo and an "Admin" tag, the
// signed-in admin (from the server check: name, access level), "View site" and Sign out; a sidebar with the plan's groups (each page with its icon and a live count where
// something waits); then the page head (title, intro, the page's actions) and the page. Below 992px the
// sidebar becomes the account's chip row that scrolls sideways. `current` marks the page. The top bar's search (Ctrl+K) reaches
// every page and the real learners and providers. A page that still shows made-up records says so beside its title (the nav's
// `demo`). A record's page passes `detail` (its reference, or what it is): the head becomes a breadcrumb back to the list and
// the record's own card carries the page's h1.
export default function AdminShell({ current, title, lead, actions = null, detail = null, children }) {
  const sideRef = useRef(null);
  const router = useRouter();
  const me = useAdminAccess();
  const [leaving, setLeaving] = useState(false);
  // the demo records (notes, history, the staff list) carry the real admin's name
  actAsAdmin(me);
  const data = useAdmin();
  // the waiting provider applications and the money badges are real; the other badges are still DEMO counts
  const providers = api.admin.providers.counts.useQuery(undefined, { staleTime: 30000 });
  // refunds to decide, open disputes and payouts to approve are real too (for admins who can see orders)
  const money = api.admin.orders.summary.useQuery(undefined, { staleTime: 30000, retry: false, enabled: Boolean(me?.permissions?.includes("orders.view")) });
  const counts = { ...(data?.counts || {}), applications: providers.data?.applications ?? 0, refunds: money.data?.refunds ?? 0, disputes: money.data?.disputes ?? 0, payouts: money.data?.payoutsToApprove ?? 0 };
  // pages behind an admin switch are listed only for admins who have it
  const nav = A.nav.map((g) => ({ ...g, items: g.items.filter((x) => !x.permission || me?.permissions?.includes(x.permission)) })).filter((g) => g.items.length);
  const items = nav.flatMap((g) => g.items);
  const page = items.find((x) => x.key === current);
  const demo = page?.demo ? A.demo[page.demo === true ? "all" : page.demo] : null;
  const demoTag = demo && <span className="rt-demo-tag" title={demo.note}>{demo.label}<span className="rt-sr">: {demo.note}</span></span>;
  const signOut = async () => {
    setLeaving(true);
    await getSupabase().auth.signOut().catch(() => {});
    router.replace(AUTH_ROUTES.adminLogin);
    router.refresh();
  };

  return (
    <div className="rt-home rt-adm">
      <a href="#rt-adm-main" className="rt-skip">Skip to main content</a>
      <header className="rt-adm__top">
        <div className="rt-adm__toprow">
          <Link href="/admin" className="rt-adm__logo" aria-label={`${A.title} dashboard`}>
            <Image width={150} height={38} src="/assets/img/general/readtraining-logo.svg" alt="" priority />
            <span className="rt-adm__tag">Admin</span>
          </Link>
          <AdminSearch pages={items} />
          <div className="rt-adm__topside">
            <Link href={A.backToSite.href} className="rt-adm__site">{A.backToSite.label}<i className="icon-arrow-top-right text-12" aria-hidden="true"></i></Link>
            <div className="rt-adm__me">
              <span className="rt-acc__avatar" aria-hidden="true">{initials(me?.name)}</span>
              <span className="rt-adm__mewho"><strong>{me?.name}</strong><span>{A.presets[me?.preset] ?? ""}</span></span>
            </div>
            <button type="button" className="rt-adm__out" onClick={signOut} disabled={leaving}>{A.signOut}</button>
          </div>
        </div>
      </header>

      <div className="rt-adm__body">
        <nav className="rt-adm__side rt-pill-scroll" aria-label="Admin" ref={sideRef}>
          {nav.map((g) => (
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
          {detail ? (
            <div className="rt-adm__crumbrow">
              <nav aria-label="Breadcrumb">
                <ol className="rt-adm__crumbs">
                  <li><Link href={page?.href ?? "/admin"}>{page?.label ?? title}</Link></li>
                  <li aria-current="page">{detail}</li>
                </ol>
              </nav>
              {demoTag}
            </div>
          ) : (
            <div className="rt-adm__head">
              <div>
                <div className="rt-adm__titlerow">
                  <h1 className="rt-adm__h1">{title}</h1>
                  {demoTag}
                </div>
                {lead && <p className="rt-adm__lead">{lead}</p>}
              </div>
              {actions}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
