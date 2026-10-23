"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account as copy } from "@/data/account";
import { businessAccount } from "@/data/businessAccount";
import { signOut } from "@/lib/auth/authClient";
import { useMe } from "@/lib/useMe";
import { useWorkspace } from "@/lib/workspaceContext";
import { RowMenu } from "@/components/admin/adminParts";
import { useSwitchAccount } from "@/lib/useSwitchAccount";
import { useHeaderOffset } from "@/lib/useHeaderOffset";

const SignOutIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
  </svg>
);

// The account menu. From 992px: a card beside the content that stays on screen as the page scrolls: who is signed in (the business,
// in the Business account) as a button that opens Switch account (the other identities on this login, and the ones to add), the
// area's pages and Sign out. Below that: the same pages as the filter chips in one row
// that scrolls sideways (Baymard: a few clear pages, understood on every visit).
export default function AccountNav({ area = "account", current }) {
  const router = useRouter();
  useHeaderOffset();
  // the signed-in person: the saved profile (API), or the sign-in record's name while that loads
  const { person, data } = useMe();
  const me = data ? { firstName: data.profile.firstName, lastName: data.profile.lastName, email: data.email } : person;
  // the saved photo, or Google's from the sign-in while the profile loads (so the initials don't flash first)
  const photo = area === "business" ? null : data ? data.profile.photoUrl : person?.avatarUrl || null;
  const menu = area === "business" ? businessAccount : copy;
  // the business this page belongs to (from the server check in the Business layout)
  const workspace = useWorkspace();
  const name = area === "business" ? workspace?.name || "" : me ? `${me.firstName || ""} ${me.lastName || ""}`.trim() || me.email : "";
  // a person's first two names on the card (the full name shows on hover); a business keeps its whole name
  const shortName = area === "business" || name.includes("@") ? name : name.split(" ").filter(Boolean).slice(0, 2).join(" ");
  const sub = area === "business" ? businessAccount.title : copy.switchAccount.student.label;
  const initials = name ? name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "";
  const switcher = useSwitchAccount(area === "business" ? { kind: "business", organisationId: workspace?.id } : { kind: "student" });
  const others = switcher.entries.filter((e) => !e.current);
  // the same rows as the header's account menu: an icon for each kind of account, then its name
  const icon = (e) => (e.kind === "student" ? "icon-person" : e.kind === "provider" || e.key === "add-provider" ? "icon-online-learning-4" : "icon-friend");
  const switchItems = [{ group: switcher.title }, ...others.map((e) => ({ key: e.key, icon: icon(e), label: e.label, onClick: () => switcher.go(e) }))];
  const who = (
    <>
      {photo ? <img className="rt-acc__avatar rt-acc__photoimg" src={photo} alt="" width="44" height="44" /> : <span className="rt-acc__avatar" aria-hidden="true">{initials}</span>}
      <span className="rt-acc__mewho">
        <strong title={name || undefined}>{shortName || " "}</strong>
        <span>{sub || " "}</span>
      </span>
    </>
  );
  const leave = async () => {
    await signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <nav className="rt-acc__nav" aria-label={menu.title}>
      <div className="rt-acc__navcard">
        {switcher.ready && others.length ? (
          <div className="rt-acc__switch">
            <RowMenu label={switcher.title} triggerClass="rt-acc__me" trigger={<>{who}<i className="icon-chevron-down text-12 rt-acc__mechev" aria-hidden="true"></i></>} items={switchItems} />
          </div>
        ) : !switcher.ready ? (
          // while the accounts load: the same card and arrow as the menu button, so nothing jumps when it arrives
          <div className="rt-acc__switch"><div className="rt-rowmenu"><div className="rt-acc__me">{who}<i className="icon-chevron-down text-12 rt-acc__mechev" aria-hidden="true"></i></div></div></div>
        ) : (
          <div className="rt-acc__me">{who}</div>
        )}
        <ul className="rt-acc__links">
          {menu.nav.map((x) => (
            <li key={x.key}>
              <Link href={x.href} className={x.key === current ? "is-active" : undefined} aria-current={x.key === current ? "page" : undefined}>
                <i className={`${x.icon} text-16`} aria-hidden="true"></i>
                <span>{x.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <button type="button" className="rt-acc__signout" onClick={leave}><SignOutIcon />{copy.signOut}</button>
      </div>
      <ul className="rt-acc__chips">
        {menu.nav.map((x) => (
          <li key={x.key}>
            <Link href={x.href} className={`rt-tr__filter${x.key === current ? " is-on" : ""}`} aria-current={x.key === current ? "page" : undefined}>{x.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
