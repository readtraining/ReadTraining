"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmLeave, leaveWithoutAsking } from "@/lib/unsavedChanges";
import FilterScrollPill from "@/components/courses/FilterScrollPill";
import AdminSearch from "./AdminSearch";
import NavIcon from "./navIcons";
import { DrawerHead, FoldChevron, MenuButton, SideMenuButton, SideResizer, sideWidthStyle, useFoldedGroups, useRailOpen, useRailTip, useSideMenu, useSideShortcut, useKeptScroll, useWorkDrawer } from "./workNav";
import { admin as A } from "@/data/admin";
import { useAdmin } from "@/lib/admin";
import { useAdminAccess } from "@/lib/adminContext";
import { api } from "@/lib/trpc/react";
import { actAsAdmin } from "@/lib/adminStore";
import { AUTH_ROUTES } from "@/lib/routes";
import { getSupabase } from "@/lib/supabase/client";
import { SHOW_DEMO } from "@/lib/demo";
import { AdminPage, Empty, RowMenu } from "./adminParts";
import { useSwitchAccount } from "@/lib/useSwitchAccount";
import { backTo, useHere } from "@/lib/backLink";

const initials = (name = "") => name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// The admin's layout: a work layout, not the public site's. The checkout header's dark band with the logo and an "Admin" tag, the
// signed-in admin (from the server check: name, access level), "View site" and Sign out; a sidebar with the plan's groups (each page with its icon and a live count where
// something waits); then the page head (title, intro, the page's actions) and the page. Each sidebar group folds (remembered in
// this browser; a folded group still shows how many things wait in it, and the page you are on is marked on its heading), and the
// button at the sidebar's top right (or Ctrl+B) folds it to a rail of icons, each with its name as a tooltip, and its right edge
// resizes it (dragged in far enough, it folds), as the provider workspace's (components/admin/workNav.jsx). Below 992px the sidebar is a menu
// drawer opened from the top bar. `current` marks the page. The top bar's search (Ctrl+K) reaches
// every page and the real learners and providers. A page that still shows made-up records says so beside its title (the nav's
// `demo`). A record's page passes `detail` (its reference, or what it is): the head becomes a back link (to the page it was opened from, or `parent`, or its list) and
// the record's own card carries the page's h1. `real`: a page of real records inside a section that is partly demo (a course in
// the catalogue) drops the section's demo label.
export default function AdminShell({ current, title, lead, actions = null, detail = null, parent = null, real = false, children }) {
  const rootRef = useRef(null);
  const sideRef = useRef(null);
  const router = useRouter();
  const me = useAdminAccess();
  const [leaving, setLeaving] = useState(false);
  const [folded, fold] = useFoldedGroups("rt-adm-nav-folded"); // the groups this admin folded
  // the admin's pop-ups open outside this page (at the end of <body>), so <body> says the admin is open: they take its sizes too
  useEffect(() => {
    document.body.classList.add("rt-adm-open");
    return () => document.body.classList.remove("rt-adm-open");
  }, []);
  const drawer = useWorkDrawer(sideRef); // the sidebar as a drawer, below 992px
  useKeptScroll(sideRef, "rt-adm-side-scroll", folded); // opening a page keeps the sidebar where it was
  const { closed, width: sideWidth } = useSideMenu(); // from 992px: folded to its icon rail, or open at this width
  useSideShortcut();
  const [tipProps, railTip] = useRailTip(closed);
  const openRail = useRailOpen(); // a click on the folded rail's empty space opens the menu
  // the demo records (notes, history, the staff list) carry the real admin's name
  actAsAdmin(me);
  const data = useAdmin();
  // the waiting provider applications, course approvals and the money badges are real; the other badges are still DEMO counts
  // the switches this admin holds: a page or badge shows only with one its area needs (data/admin.js nav `permission`)
  const may = (need) => !need || (Array.isArray(need) ? need : [need]).some((p) => me?.permissions?.includes(p));
  const providers = api.admin.providers.counts.useQuery(undefined, { staleTime: 30000, retry: false, enabled: may(["approve", "suspend"]) });
  const courses = api.admin.courses.counts.useQuery(undefined, { staleTime: 30000, retry: false, enabled: may(["approve", "catalogue"]) });
  // refunds to decide, open disputes and payouts to approve are real too (for admins who can see orders)
  const money = api.admin.orders.summary.useQuery(undefined, { staleTime: 30000, retry: false, enabled: Boolean(me?.permissions?.includes("orders.view")) });
  // account closure requests waiting (for admins who can close accounts)
  const closures = api.admin.closures.counts.useQuery(undefined, { staleTime: 30000, retry: false, enabled: Boolean(me?.permissions?.includes("suspend")) });
  // applications and approvals waiting count only for an admin who decides them (the approve switch)
  const decides = may("approve");
  const counts = { ...(SHOW_DEMO ? data?.counts || {} : {}), applications: decides ? providers.data?.applications ?? 0 : 0, approvals: decides ? courses.data?.waiting ?? 0 : 0, refunds: money.data?.refunds ?? 0, disputes: money.data?.disputes ?? 0, payouts: money.data?.payoutsToApprove ?? 0, closures: closures.data?.open ?? 0 };
  // pages behind an admin switch are listed only for admins who have it, and opening one by its address says so instead
  const nav = A.nav.map((g) => ({ ...g, items: g.items.filter((x) => may(x.permission)) })).filter((g) => g.items.length);
  const items = nav.flatMap((g) => g.items);
  const page = items.find((x) => x.key === current);
  // a record's page goes back to the page it was opened from (lib/backLink.js), otherwise to its list
  const here = useHere();
  const back = backTo(here.includes("?") ? here.slice(here.indexOf("?")) : "", here, parent ?? { label: page?.label ?? title, href: page?.href ?? "/admin" });
  const barred = !page && A.nav.some((g) => g.items.some((x) => x.key === current));
  const demo = SHOW_DEMO && page?.demo && !real ? A.demo[page.demo === true ? "all" : page.demo] : null;
  // on the live site a page made only of demo records shows an honest empty state instead (lib/demo.js)
  const demoOff = !SHOW_DEMO && page?.demo === true ? A.demoOff[current] : null;
  const demoTag = demo && <span className="rt-demo-tag" title={demo.note}>{demo.label}<span className="rt-sr">: {demo.note}</span></span>;
  // The account menu (the avatar, as in the provider workspace): who is signed in and their access, View site, Switch account
  // for an admin who also has a provider account (their own workspace with their own role, their student account), Sign out.
  const switcher = useSwitchAccount({ kind: "admin" });
  const provider = switcher.entries.find((e) => e.kind === "provider");
  const access = me?.isSuper ? A.team.superAdmin : me?.preset === "custom" && me.roles?.length ? me.roles.map((r) => A.presets[r]).join(" + ") : A.presets[me?.preset] ?? "";
  const accountItems = [
    { label: A.backToSite.label, href: A.backToSite.href, newTab: true },
    ...(provider ? [{ group: switcher.title }, ...switcher.entries.filter((e) => !e.current && e.kind !== "add").map((e) => ({ key: e.key, label: e.label, onClick: () => switcher.go(e) }))] : []),
    { label: A.signOut, onClick: () => !leaving && signOut() },
  ];
  const signOut = async () => {
    if (!confirmLeave()) return; // unsaved edits on the page: ask first, as a link would
    setLeaving(true);
    await getSupabase().auth.signOut().catch(() => {});
    leaveWithoutAsking(() => {
      router.replace(AUTH_ROUTES.adminLogin);
      router.refresh();
    });
  };

  return (
    <div className={`rt-home rt-adm rt-adm--platform${closed ? " is-sideclosed" : ""}`} style={sideWidthStyle(sideWidth)} ref={rootRef}>
      <a href="#rt-adm-main" className="rt-skip">Skip to main content</a>
      <header className="rt-adm__top">
        <div className="rt-adm__toprow">
          <MenuButton drawer={drawer} controls="rt-adm-side" />
          <Link href="/admin" className="rt-adm__logo" aria-label={`${A.title} dashboard`}>
            <Image width={150} height={38} src="/assets/img/general/readtraining-logo.svg" alt="" priority />
            <span className="rt-adm__tag">Admin</span>
          </Link>
          <AdminSearch pages={items} />
          <div className="rt-adm__topside">
            {me?.name && (
              <RowMenu label={`${initials(me.name)}, account menu for ${me.name}`} triggerClass="rt-pws__avatar" trigger={<span className="rt-acc__avatar" aria-hidden="true">{initials(me.name)}</span>}
                head={<><strong title={me.name}>{me.name}</strong>{switcher.email && <span title={switcher.email}>{switcher.email}</span>}<small title={access}>Admin · {access}</small></>}
                items={accountItems} />
            )}
          </div>
        </div>
      </header>

      <div className="rt-adm__body">
        {drawer.menuOpen && <div className="rt-adm__scrim" onClick={drawer.closeMenu} aria-hidden="true"></div>}
        <nav id="rt-adm-side" className={`rt-adm__side rt-pill-scroll${drawer.menuOpen ? " is-open" : ""}`} aria-label="Admin" ref={sideRef} onClick={openRail}>
          <DrawerHead drawer={drawer} />
          <div className="rt-adm__sidetools">
            <SideMenuButton controls="rt-adm-side" />
          </div>
          {nav.map((g) => {
            const here = g.items.some((x) => x.key === current);
            const shut = folded.includes(g.group);
            const waiting = g.items.reduce((n, x) => n + (x.badge ? counts[x.badge] || 0 : 0), 0);
            const id = `rt-adm-g-${g.group.toLowerCase()}`;
            return (
              <div key={g.group} className={`rt-adm__group${shut ? " is-folded" : ""}`}>
                <button type="button" className={`rt-adm__grouplabel${shut && here ? " is-here" : ""}`} aria-expanded={!shut} aria-controls={id} onClick={() => fold(g.group)}>
                  <FoldChevron />
                  <span>{g.group}</span>
                  {shut && here && <span className="rt-sr">, contains the page you are on</span>}
                  {shut && waiting > 0 && <span className="rt-adm__count" aria-label={`${waiting} waiting`}>{waiting}</span>}
                </button>
                <ul id={id} hidden={shut}>
                  {g.items.map((x) => (
                    <li key={x.key}>
                      <Link href={x.href} className={`rt-adm__link${x.key === current ? " is-active" : ""}`} aria-current={x.key === current ? "page" : undefined} {...(closed ? { "data-tip": x.label, ...tipProps } : {})}>
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
              <span className="rt-adm__mewho"><strong>{me?.name}</strong><span>{access}</span></span>
            </div>
            {provider && <Link href={provider.href} className="rt-adm__link" onClick={(e) => { e.preventDefault(); switcher.go(provider); }}>{A.providerWorkspace}</Link>}
            <Link href={A.backToSite.href} className="rt-adm__link">{A.backToSite.label}</Link>
            <button type="button" className="rt-adm__link" onClick={signOut} disabled={leaving}>{A.signOut}</button>
          </div>
          <FilterScrollPill scrollRef={sideRef} />
        </nav>
        <SideResizer rootRef={rootRef} sideRef={sideRef} controls="rt-adm-side" />
        {railTip}

        <main id="rt-adm-main" className="rt-adm__main" tabIndex={-1}>
          {detail ? (
            <div className="rt-adm__crumbrow">
              <div className="rt-adm__crumbstart">
                <Link href={back.href} className="rt-pws__back"><i className="icon-arrow-left text-10" aria-hidden="true"></i>{back.label}</Link>
                {demoTag}
              </div>
              {/* a record's page has its main action here too (a provider's Price plans: Create price plan, as staff) */}
              <div className="rt-adm__actions" id="rt-adm-actions">{actions}</div>
            </div>
          ) : (
            <div className="rt-adm__head">
              <div>
                <div className="rt-adm__titlerow">
                  <h1 className="rt-adm__h1">{title}</h1>
                  {demoTag}
                </div>
                {lead && !barred && <p className="rt-adm__lead">{lead}</p>}
              </div>
              {/* the page's main action, top right (adminParts HeaderAction puts it here) */}
              <div className="rt-adm__actions" id="rt-adm-actions">{actions}</div>
            </div>
          )}
          {/* the page key lets an empty state show this page's own icon */}
          <AdminPage.Provider value={current}>{barred ? <Empty kind="missing" title={A.noAccess.title} text="" action={{ href: "/admin", label: A.noAccess.back }} /> : demoOff ? <Empty title={demoOff[0]} text={demoOff[1]} /> : children}</AdminPage.Provider>
        </main>
      </div>
    </div>
  );
}
