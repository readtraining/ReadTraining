"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account as copy } from "@/data/account";
import { businessAccount } from "@/data/businessAccount";
import { signOut } from "@/lib/auth/authClient";
import { useMe } from "@/lib/useMe";
import { useWorkspace } from "@/lib/workspaceContext";
import SwitchAccount from "./SwitchAccount";

const SignOutIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
  </svg>
);

// The account menu. From 992px: a card beside the content with who is signed in (the business, in the Business account), the
// area's pages, Switch account (the identities on this login) and Sign out (sticky). Below that: the same pages as the filter chips in one row
// that scrolls sideways (Baymard: a few clear pages, understood on every visit).
export default function AccountNav({ area = "account", current }) {
  const router = useRouter();
  // the signed-in person: the saved profile (API), or the sign-in record's name while that loads
  const { person, data } = useMe();
  const me = data ? { firstName: data.profile.firstName, lastName: data.profile.lastName, email: data.email } : person;
  const photo = area === "business" ? null : data?.profile.photoUrl;
  const menu = area === "business" ? businessAccount : copy;
  // the business this page belongs to (from the server check in the Business layout)
  const workspace = useWorkspace();
  const name = area === "business" ? workspace?.name || "" : me ? `${me.firstName || ""} ${me.lastName || ""}`.trim() || me.email : "";
  const sub = area === "business" ? (me ? `${businessAccount.title} · ${me.firstName} ${me.lastName}` : businessAccount.title) : me?.email || "";
  const initials = name ? name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "";
  const leave = async () => {
    await signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <nav className="rt-acc__nav" aria-label={menu.title}>
      <div className="rt-acc__navcard">
        <div className="rt-acc__me">
          {photo ? <img className="rt-acc__avatar rt-acc__photoimg" src={photo} alt="" width="44" height="44" /> : <span className="rt-acc__avatar" aria-hidden="true">{initials}</span>}
          <div className="rt-acc__mewho">
            <strong>{name || " "}</strong>
            <span>{sub || " "}</span>
          </div>
        </div>
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
        <SwitchAccount current={area === "business" ? { kind: "business", organisationId: workspace?.id } : { kind: "student" }} />
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
