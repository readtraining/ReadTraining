"use client";
import { AUTH_ROUTES } from "@/lib/routes";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account } from "@/data/account";
import { signOut, useAuthUser } from "@/lib/auth/authClient";
import { useSwitchAccount } from "@/lib/useSwitchAccount";

const initials = (p) => (p.firstName ? `${p.firstName[0]}${p.lastName?.[0] || ""}` : p.email[0]).toUpperCase();

// The header's right-hand side. Signed out: "Log in" and "Sign up", as before. Signed in: the person's initials and first name,
// opening a menu with their account's pages, Switch account (the identities on this login, from the API) and "Sign out" (closes
// on a click outside, Escape, or choosing an item). `mobile`:
// the mobile menu's row (plain links). While the session is being read nothing is shown, so the buttons never flash.
export default function HeaderAuth({ mobile = false, pathname = "" }) {
  const person = useAuthUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const btnRef = useRef(null);
  const switcher = useSwitchAccount({ kind: "student" });
  const provider = switcher.entries.find((e) => e.kind === "provider");

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const leave = async () => {
    setOpen(false);
    await signOut();
    router.replace("/");
    router.refresh();
  };

  if (person === undefined) return <div className={mobile ? "rt-hauth-mobile" : "rt-hauth"} aria-hidden="true"></div>;

  if (mobile) {
    return person ? (
      <div className="rt-hauth-mobile">
        <Link href="/account" className="text-dark-1 fw-500">My account</Link>
        {provider && <Link href={provider.href} className="text-dark-1 fw-500 ml-30" onClick={(e) => { e.preventDefault(); switcher.go(provider); }}>Provider workspace</Link>}
        <button type="button" className="text-dark-1 ml-30 rt-hauth__out" onClick={leave}>{account.signOut}</button>
      </div>
    ) : (
      <div className="rt-hauth-mobile">
        <Link href={AUTH_ROUTES.login} className={`text-dark-1 ${pathname === "/login" ? "activeMenu" : "inActiveMenu"}`}>Log in</Link>
        <Link href={AUTH_ROUTES.signUp} className={`text-dark-1 ml-30 ${pathname === "/signup" ? "activeMenu" : "inActiveMenu"}`}>Sign Up</Link>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="rt-hauth">
        <Link href={AUTH_ROUTES.login} className="button -underline text-white">Log in</Link>
        <Link href={AUTH_ROUTES.signUp} className="button -sm -white text-dark-1 ml-30">Sign up</Link>
      </div>
    );
  }

  return (
    <div className="rt-hauth" ref={boxRef}>
      <button type="button" ref={btnRef} className="rt-hauth__btn" aria-expanded={open} aria-controls="rt-hauth-menu" onClick={() => setOpen((v) => !v)}>
        <span className="rt-hauth__avatar" aria-hidden="true">{initials(person)}</span>
        <span className="rt-hauth__name">{person.firstName || "My account"}</span>
        <i className="icon-chevron-down text-11" aria-hidden="true"></i>
      </button>
      {open && (
        <div className="rt-hauth__menu" id="rt-hauth-menu">
          <div className="rt-hauth__who">
            <strong>{person.name}</strong>
            <span>{person.email}</span>
          </div>
          <ul>
            {account.nav.map((x) => (
              <li key={x.key}>
                <Link href={x.href} onClick={() => setOpen(false)}><i className={`${x.icon} text-14`} aria-hidden="true"></i>{x.label}</Link>
              </li>
            ))}
          </ul>
          {switcher.ready && (
            <>
              <p className="rt-hauth__group">{switcher.title}</p>
              <ul>
                {switcher.entries.filter((e) => !e.current).map((e) => (
                  <li key={e.key}>
                    <Link href={e.href} onClick={(ev) => { ev.preventDefault(); setOpen(false); switcher.go(e); }}>
                      <i className={`${e.kind === "student" ? "icon-person" : e.kind === "provider" || e.key === "add-provider" ? "icon-online-learning-4" : "icon-friend"} text-14`} aria-hidden="true"></i>{e.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <button type="button" className="rt-hauth__signout" onClick={leave}>{account.signOut}</button>
        </div>
      )}
    </div>
  );
}
