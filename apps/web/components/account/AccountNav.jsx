"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account as copy } from "@/data/account";
import { businessAccount } from "@/data/businessAccount";
import { getProfile } from "@/lib/account";
import { signOut, useAuthUser } from "@/lib/auth/authClient";

const SignOutIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
  </svg>
);

// The account menu. From 992px: a card beside the content with who is signed in (the company, in the Business account), the
// area's pages, the switch to the other account and Sign out (sticky). Below that: the same pages as the filter chips in one row
// that scrolls sideways (Baymard: a few clear pages, understood on every visit).
export default function AccountNav({ area = "account", current }) {
  const router = useRouter();
  const [demo, setDemo] = useState(null);
  const person = useAuthUser();
  useEffect(() => setDemo(getProfile()), []);
  // the signed-in person (Supabase Auth); the demo profile only fills in until the session is read
  const me = person ? { firstName: person.firstName, lastName: person.lastName, email: person.email } : demo;
  const menu = area === "business" ? businessAccount : copy;
  const name = area === "business" ? businessAccount.company.name : me ? `${me.firstName || ""} ${me.lastName || ""}`.trim() || me.email : "";
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
          <span className="rt-acc__avatar" aria-hidden="true">{initials}</span>
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
        <Link href={menu.switchTo.href} className="fb-textlink rt-acc__switch">{menu.switchTo.label}<i className="icon-arrow-right text-12" aria-hidden="true"></i></Link>
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
