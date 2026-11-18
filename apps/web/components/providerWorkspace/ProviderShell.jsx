"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { confirmLeave, leaveWithoutAsking } from "@/lib/unsavedChanges";
import FilterScrollPill from "@/components/courses/FilterScrollPill";
import { RowMenu } from "@/components/admin/adminParts";
import NavIcon from "@/components/admin/navIcons";
import { DrawerHead, FoldChevron, MenuButton, SideMenuButton, SideResizer, sideWidthStyle, useFoldedGroups, useRailTip, useSideMenu, useSideShortcut, useWorkDrawer } from "@/components/admin/workNav";
import { pw } from "@/data/providerWorkspace";
import { signOut } from "@/lib/auth/authClient";
import { actAs } from "@/lib/providerWorkspace";
import { useMe } from "@/lib/useMe";
import { useSwitchAccount } from "@/lib/useSwitchAccount";
import { useWorkspace } from "@/lib/workspaceContext";
import { useProviderAccess } from "@/lib/providerAccess";
import { SHOW_DEMO } from "@/lib/demo";
import { api } from "@/lib/trpc/react";
import ProviderAccountStatus from "./ProviderAccountStatus";
import { NewCourseProvider, NewCourseSheet } from "./NewCourse";

const initials = (name) => name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// The provider workspace's layout, with navigation in our design (DESIGN-SYSTEM.md, "Provider workspace follows the same
// shell pattern"). The dark band, the same on every page: the logo and "Provider" tag, then Student (a plain text link to the learner
// side), the bell with unread notifications and the avatar's account menu (account settings, public profile, team, switch account, log out). The sidebar:
// Dashboard, then Courses and Cohorts as groups that fold their pages, Learners, Orders, Performance and Help; the same
// sidebar parts as the admin (components/admin/workNav.jsx): its icons, folding groups and, below 992px, the menu drawer. From
// 992px the button at its top (or Ctrl+B) folds it to a rail of icons, one per item (a group's goes to its first page, each with
// its name as a tooltip), and its right edge resizes it (dragged in far enough, it folds). Then the page head (title, intro,
// actions) and the page.
// `current` marks the section; the page inside it is matched on the address. `demo` marks a page whose records are still made up
// (orders, learners and the rest, lib/providerWorkspace.js): a "Demo data" tag beside the title, as the admin's. It is true (the
// general note), "partly", or the page's own note (data/providerWorkspace.js pw.demo), which the tag then explains.
export default function ProviderShell({ current, title, lead, actions = null, back = null, demo = false, children }) {
  const rootRef = useRef(null);
  const sideRef = useRef(null);
  const router = useRouter();
  const path = usePathname();
  const [search, setSearch] = useState("");
  const [folded, fold] = useFoldedGroups("rt-pws-nav-folded");
  const drawer = useWorkDrawer(sideRef); // the sidebar as a drawer, below 992px
  const { closed: rail, width: sideWidth } = useSideMenu(); // from 992px: folded to its icon rail, or open at this width
  useSideShortcut();
  const [tipProps, railTip] = useRailTip(rail);
  const access = useProviderAccess();
  const nav = pw.nav.filter((x) => !x.can || access.can(x.can));
  const demoText = !SHOW_DEMO || !demo ? null : demo === true ? pw.demo.all : demo === "partly" ? pw.demo.partly : { label: pw.demo.all.label, note: demo };
  const demoTag = demoText && <span className="rt-demo-tag" title={demoText.note}>{demoText.label}<span className="rt-sr">: {demoText.note}</span></span>;
  useEffect(() => setSearch(window.location.search), [path]);
  // New course: a pop-up over this page (NewCourse.jsx), from any New course button, or from a link with ?newcourse=1 (the set-up
  // checklist, the old /provider/courses/new address), which is taken off the address at once (replaceState, which Next's router
  // follows): left there until a slower router.replace, typing would make the unsaved-changes guard keep ?newcourse=1 in the
  // history, and closing the pop-up would step back to it and open New course again
  const [newCourse, setNewCourse] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(search);
    if (q.get("newcourse") !== "1") return;
    setNewCourse(true);
    q.delete("newcourse");
    window.history.replaceState(null, "", `${path}${q.size ? `?${q}` : ""}`);
  }, [search, path]);
  // pop-ups (Sheet) render on <body>, outside the workspace: this class gives them the workspace's form and button look
  useEffect(() => {
    document.body.classList.add("rt-pws-open");
    return () => document.body.classList.remove("rt-pws-open");
  }, []);
  // a group's page is current when its path matches and, for ?tab= / ?mode= pages, its query does too
  // a page opened from a notification goes back to the notifications; otherwise to its own list (`back`)
  const backTo = /(^|[?&])from=notifications(&|$)/.test(search) ? { label: "Notifications", href: "/provider/notifications" } : back;
  const isHere = (href, siblings) => {
    const [p, q = ""] = href.split("?");
    if (p !== path) return false;
    if (q) return search.includes(q);
    return !siblings.some((x) => x.href.includes("?") && x.href.startsWith(`${p}?`) && search.includes(x.href.split("?")[1]));
  };
  // a menu link; one to this same page with another ?tab= or ?mode= loads the page again, so it opens on that view
  const pageLink = (href, props, inner) =>
    href.split("?")[0] === path && href !== `${path}${search}` ? <a href={href} {...props}>{inner}</a> : <Link href={href} {...props}>{inner}</Link>;
  // the bell's unread number and the menu's badges count DEMO records (lib/providerWorkspace.js), so they stay hidden until those
  // records are real: a made-up "3 unread" must not look like real news
  const counts = {};
  // the real provider (from the server check in the layout) and the signed-in person; the pages' records are still DEMO data
  const workspace = useWorkspace();
  // the status can change while the page is open (approved, changes asked for, not approved, suspended): check quietly every
  // minute and when the tab is used again, and reload the page from the server when it changed or the workspace closed
  const live = api.organisations.openWorkspace.useQuery(
    { type: "provider", organisationId: workspace?.id, path: path || "/provider" },
    { enabled: Boolean(workspace?.id), refetchInterval: 60_000, refetchOnWindowFocus: true, retry: false },
  );
  const closed = live.error?.data?.code === "FORBIDDEN";
  const changed = live.data && live.data.status !== workspace?.status;
  useEffect(() => {
    if (closed || changed) router.refresh();
  }, [closed, changed, router]);
  const org = workspace?.name || "";
  const { person, data: meData } = useMe();
  const meName = meData ? `${meData.profile.firstName} ${meData.profile.lastName}`.trim() : person?.name || "";
  const meEmail = meData?.email || person?.email || "";
  const switcher = useSwitchAccount({ kind: "provider", organisationId: workspace?.id });
  const student = switcher.entries.find((e) => e.kind === "student");
  useEffect(() => {
    if (meName || workspace?.name) actAs({ name: meName, email: meEmail, orgName: workspace?.name });
  }, [meName, meEmail, workspace?.name]);
  const switchItems = switcher.ready ? [{ group: switcher.title }, ...switcher.entries.filter((e) => !e.current).map((e) => ({ label: e.label, onClick: () => switcher.go(e) }))] : [];
  const logOut = async () => {
    if (!confirmLeave()) return; // unsaved edits on the page: ask first, as a link would
    await signOut();
    leaveWithoutAsking(() => {
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <NewCourseProvider value={() => setNewCourse(true)}>
    <div className={`rt-home rt-adm rt-pws${rail ? " is-sideclosed" : ""}`} style={sideWidthStyle(sideWidth)} ref={rootRef}>
      <a href="#rt-pws-main" className="rt-skip">Skip to main content</a>
      <header className="rt-adm__top">
        <div className="rt-adm__toprow">
          <MenuButton drawer={drawer} controls="rt-pws-side" />
          <Link href="/provider" className="rt-adm__logo" aria-label={`${pw.title}: dashboard`}>
            <Image width={150} height={38} src="/assets/img/general/readtraining-logo.svg" alt="" priority />
            <span className="rt-adm__tag">{pw.tag}</span>
          </Link>
          <div className="rt-adm__topside">
            <Link href="/account" className="rt-adm__site rt-pws__student" onClick={(e) => { if (student) { e.preventDefault(); switcher.go(student); } }}>Student</Link>
            <Link href="/provider/notifications" className="rt-pws__bell" aria-label={counts.unread ? `Notifications, ${counts.unread} unread` : "Notifications"}>
              <i className="icon-notification text-18" aria-hidden="true"></i>
              {counts.unread > 0 && <span className="rt-pws__bellcount" aria-hidden="true">{counts.unread}</span>}
            </Link>
            {meName && (
              <RowMenu label={meName ? `${initials(meName)}, account menu for ${meName}` : "Account menu"} triggerClass="rt-pws__avatar" trigger={<span className="rt-acc__avatar" aria-hidden="true">{initials(meName)}</span>}
                head={<><strong title={meName}>{meName}</strong><span title={meEmail}>{meEmail}</span><small title={org || undefined}>{org ? `Provider · ${org}` : "Provider account"}</small></>}
                items={[...pw.accountMenu.filter((x) => !x.need || access.can(x.need)).map(({ need, ...x }) => x), ...switchItems, { label: "Log out", onClick: logOut }]} />
            )}
          </div>
        </div>
      </header>

      <div className="rt-adm__body">
        {drawer.menuOpen && <div className="rt-adm__scrim" onClick={drawer.closeMenu} aria-hidden="true"></div>}
        <nav id="rt-pws-side" className={`rt-adm__side rt-pill-scroll${drawer.menuOpen ? " is-open" : ""}`} aria-label="Provider workspace" ref={sideRef}>
          <DrawerHead drawer={drawer} />
          {/* the fold button sits in the account card while the menu is open (one row, as the account it belongs to) and alone at
              the top of the icon rail when folded, where the card is hidden */}
          <div className="rt-adm__sidetools">
            <SideMenuButton controls="rt-pws-side" shortcut />
          </div>
          <div className="rt-pws__org">
            <span className="rt-pws__orgmark" aria-hidden="true">{org ? initials(org) : ""}</span>
            <span className="rt-pws__orgname"><strong>{org || " "}</strong><span>Training provider</span></span>
            <SideMenuButton controls="rt-pws-side" shortcut />
          </div>
          <ul className="rt-pws__nav">
            {nav.map((x) => {
              const here = x.key === current;
              const badge = x.badge && counts[x.badge] > 0 ? <span className="rt-adm__count" aria-label={`${counts[x.badge]} new`}>{counts[x.badge]}</span> : null;
              if (!x.items) {
                return (
                  <li key={x.key}>
                    <Link href={x.href} className={`rt-adm__link${here ? " is-active" : ""}`} aria-current={here ? "page" : undefined}>
                      <NavIcon name={x.navIcon || x.key} /><span>{x.label}</span>{badge}
                    </Link>
                  </li>
                );
              }
              // a group (Courses, Cohorts): its heading folds its pages, which sit indented under a guide line as the admin's do
              const shut = folded.includes(x.key);
              const id = `rt-pws-nav-${x.key}`;
              return (
                <li key={x.key} className={`rt-adm__group rt-pws__group${shut ? " is-folded" : ""}${here ? " is-here" : ""}`}>
                  <button type="button" className="rt-adm__link rt-pws__grouphead" aria-expanded={!shut} aria-controls={id} onClick={() => fold(x.key)}>
                    <NavIcon name={x.navIcon || x.key} /><span>{x.label}</span>
                    {shut && here && <span className="rt-sr">, contains the page you are on</span>}
                    {shut && badge}
                    <FoldChevron />
                  </button>
                  <ul id={id} hidden={shut}>
                    {x.items.map((it) => {
                      const on = isHere(it.href, x.items);
                      const n = it.badge && counts[it.badge] > 0 ? counts[it.badge] : 0;
                      const cls = `rt-adm__link${on ? " is-active" : ""}`;
                      const inner = <><span>{it.label}</span>{n > 0 && <span className="rt-adm__count" aria-label={`${n} new`}>{n}</span>}</>;
                      return <li key={it.href}>{pageLink(it.href, { className: cls, "aria-current": on ? "page" : undefined }, inner)}</li>;
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
          {/* folded (from 992px): one icon per item, straight to its page (a group's first page), its name in a tooltip */}
          {rail && (
            <ul className="rt-pws__rail">
              {nav.map((x) => {
                const here = x.key === current;
                const props = { className: `rt-adm__link${here ? " is-active" : ""}`, "aria-current": here ? "page" : undefined, "data-tip": x.label, ...tipProps };
                const inner = <><NavIcon name={x.navIcon || x.key} /><span className="rt-sr">{x.label}</span></>;
                return <li key={x.key}>{x.items ? pageLink(x.items[0].href, props, inner) : <Link href={x.href} {...props}>{inner}</Link>}</li>;
              })}
            </ul>
          )}
          <div className="rt-adm__drawerfoot">
            {meName && (
              <div className="rt-adm__me">
                <span className="rt-acc__avatar" aria-hidden="true">{initials(meName)}</span>
                <span className="rt-adm__mewho"><strong>{meName}</strong><span>{org ? `${org} · Provider account` : "Provider account"}</span></span>
              </div>
            )}
            <Link href="/account" className="rt-adm__link" onClick={(e) => { if (student) { e.preventDefault(); switcher.go(student); } }}>Student account</Link>
            <button type="button" className="rt-adm__link" onClick={logOut}>Log out</button>
          </div>
          <FilterScrollPill scrollRef={sideRef} />
        </nav>
        <SideResizer rootRef={rootRef} sideRef={sideRef} controls="rt-pws-side" />
        {railTip}

        <main id="rt-pws-main" className="rt-adm__main" tabIndex={-1}>
          <ProviderAccountStatus />
          {backTo && <Link href={backTo.href} className="rt-pws__back"><i className="icon-arrow-left text-10" aria-hidden="true"></i>{backTo.label}</Link>}
          <div className="rt-adm__head">
            <div>
              <div className="rt-adm__titlerow">
                <h1 className="rt-adm__h1">{title}</h1>
                {demoTag}
              </div>
              {lead && <p className="rt-adm__lead">{lead}</p>}
            </div>
            <div className="rt-adm__actions" id="rt-adm-actions">{actions}</div>
          </div>
          {children}
        </main>
      </div>
    </div>
    <NewCourseSheet open={newCourse} onClose={() => setNewCourse(false)} />
    </NewCourseProvider>
  );
}
