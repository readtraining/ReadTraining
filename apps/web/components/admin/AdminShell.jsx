"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import FilterScrollPill from "@/components/courses/FilterScrollPill";
import AdminSearch from "./AdminSearch";
import NavIcon from "./navIcons";
import { admin as A } from "@/data/admin";
import { useAdmin } from "@/lib/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { api } from "@/lib/trpc/react";
import { actAsAdmin } from "@/lib/adminStore";
import { AUTH_ROUTES } from "@/lib/routes";
import { getSupabase } from "@/lib/supabase/client";
import { useFocusTrap } from "@/lib/useFocusTrap";

const initials = (name = "") => name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const FOLDED_KEY = "rt-adm-nav-folded";
const readFolded = () => {
  try {
    return JSON.parse(window.localStorage.getItem(FOLDED_KEY) || "[]");
  } catch {
    return [];
  }
};

// The admin's layout: a work layout, not the public site's. The checkout header's dark band with the logo and an "Admin" tag, the
// signed-in admin (from the server check: name, access level), "View site" and Sign out; a sidebar with the plan's groups (each page with its icon and a live count where
// something waits); then the page head (title, intro, the page's actions) and the page. Each sidebar group folds (remembered in
// this browser; the current page's group always shows, and a folded group still shows how many things wait in it). Below 992px
// the sidebar is a menu drawer opened from the top bar. `current` marks the page. The top bar's search (Ctrl+K) reaches
// every page and the real learners and providers. A page that still shows made-up records says so beside its title (the nav's
// `demo`). A record's page passes `detail` (its reference, or what it is): the head becomes a breadcrumb back to the list and
// the record's own card carries the page's h1.
export default function AdminShell({ current, title, lead, actions = null, detail = null, children }) {
  const sideRef = useRef(null);
  const router = useRouter();
  const me = useAdminAccess();
  const [leaving, setLeaving] = useState(false);
  const [folded, setFolded] = useState([]); // the groups this admin folded
  const [menuOpen, setMenuOpen] = useState(false); // the drawer, below 992px
  const menuBtn = useRef(null);
  const closeBtn = useRef(null);
  const pathname = usePathname();
  useEffect(() => setFolded(readFolded()), []);
  useEffect(() => setMenuOpen(false), [pathname]);
  // the open drawer: focus on its close button, and the page behind doesn't scroll
  useEffect(() => {
    if (!menuOpen) return;
    closeBtn.current?.focus();
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, [menuOpen]);
  const closeMenu = () => {
    setMenuOpen(false);
    menuBtn.current?.focus();
  };
  useFocusTrap(menuOpen, sideRef, closeMenu);
  const fold = (group) =>
    setFolded((f) => {
      const next = f.includes(group) ? f.filter((g) => g !== group) : [...f, group];
      try {
        window.localStorage.setItem(FOLDED_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
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
          <button type="button" className="rt-adm__menu" ref={menuBtn} aria-expanded={menuOpen} aria-controls="rt-adm-side" onClick={() => setMenuOpen((o) => !o)}>
            <span aria-hidden="true"></span>
            <span className="rt-sr">{menuOpen ? "Close menu" : "Menu"}</span>
          </button>
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
        {menuOpen && <div className="rt-adm__scrim" onClick={closeMenu} aria-hidden="true"></div>}
        <nav id="rt-adm-side" className={`rt-adm__side rt-pill-scroll${menuOpen ? " is-open" : ""}`} aria-label="Admin" ref={sideRef}>
          <div className="rt-adm__drawerhead">
            <span className="rt-adm__drawertitle">Menu</span>
            <button type="button" className="rt-adm__drawerclose" ref={closeBtn} onClick={closeMenu}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              <span className="rt-sr">Close menu</span>
            </button>
          </div>
          {nav.map((g) => {
            const here = g.items.some((x) => x.key === current);
            const shut = folded.includes(g.group) && !here;
            const waiting = g.items.reduce((n, x) => n + (x.badge ? counts[x.badge] || 0 : 0), 0);
            const id = `rt-adm-g-${g.group.toLowerCase()}`;
            return (
              <div key={g.group} className={`rt-adm__group${shut ? " is-folded" : ""}`}>
                <button type="button" className="rt-adm__grouplabel" aria-expanded={!shut} aria-controls={id} onClick={() => !here && fold(g.group)} aria-disabled={here || undefined}>
                  <span>{g.group}</span>
                  {shut && waiting > 0 && <span className="rt-adm__count" aria-label={`${waiting} waiting`}>{waiting}</span>}
                  {!here && <i className="icon-chevron-down text-10" aria-hidden="true"></i>}
                </button>
                <ul id={id} hidden={shut}>
                  {g.items.map((x) => (
                    <li key={x.key}>
                      <Link href={x.href} className={`rt-adm__link${x.key === current ? " is-active" : ""}`} aria-current={x.key === current ? "page" : undefined}>
                        <NavIcon name={x.key} />
                        <span>{x.label}</span>
                        {x.badge && counts[x.badge] > 0 && <span className="rt-adm__count" aria-label={`${counts[x.badge]} waiting`}>{counts[x.badge]}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="rt-adm__drawerfoot">
            <div className="rt-adm__me">
              <span className="rt-acc__avatar" aria-hidden="true">{initials(me?.name)}</span>
              <span className="rt-adm__mewho"><strong>{me?.name}</strong><span>{A.presets[me?.preset] ?? ""}</span></span>
            </div>
            <Link href={A.backToSite.href} className="rt-adm__link">{A.backToSite.label}</Link>
            <button type="button" className="rt-adm__link" onClick={signOut} disabled={leaving}>{A.signOut}</button>
          </div>
          <FilterScrollPill scrollRef={sideRef} />
        </nav>

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
