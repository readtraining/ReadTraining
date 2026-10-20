"use client";

import React, { useEffect, useRef, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { AUTH_ROUTES } from "@/lib/routes";
import { safeNext } from "@/lib/safeNext";

// "Sign in with Google" through Google's own button (Google Identity Services). Google's window opens over our page and hands the
// sign-in back to it, and Supabase checks it (signInWithIdToken), so Google names our site instead of the database's
// *.supabase.co address it names when the browser is sent there and back. Same Google account → same ReadTraining account.
// Google only allows the addresses listed in the Google Cloud client (Authorised JavaScript origins): the site's own address
// and localhost. Anywhere else (Vercel previews), or when the client ID is not set, `useGoogleButton` says so and the page keeps
// its own Google button, which goes through Supabase as before.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const ORIGINS = [process.env.NEXT_PUBLIC_GOOGLE_ORIGIN, "http://localhost:3000"].filter(Boolean).map((u) => {
  try {
    return new URL(u).origin;
  } catch {
    return "";
  }
});
const SCRIPT = "https://accounts.google.com/gsi/client";

let loading = null;
const loadScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        reject(new Error("script"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
};

// a random value: Google signs its hash into the sign-in, Supabase checks it against the value itself
async function makeNonce() {
  const raw = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return { raw, hashed: Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("") };
}

// Google is set up once per page load (it warns when initialize runs again, as StrictMode and moving between log in and sign up
// would do); its answer goes to whichever button is on the page now.
let ready = null;
let onCredential = null;
const setUp = () => {
  if (!ready) {
    ready = (async () => {
      await loadScript();
      const nonce = await makeNonce();
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        nonce: nonce.hashed,
        ux_mode: "popup",
        callback: (res) => onCredential?.(res.credential, nonce.raw),
      });
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
};

// true when Google's button can be used on this page (checked in the browser, after the first render)
export function useGoogleButton() {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(Boolean(CLIENT_ID && isSupabaseConfigured && ORIGINS.includes(window.location.origin))), []);
  return ok;
}

// Google's button, exactly as wide as its cell (drawn again when the cell changes width). On success the page goes to
// /auth/confirm, which sends the welcome email once and continues to ?next= (as the old way did); a problem is shown through
// onError. If the script cannot load or the button has not appeared after 3 seconds, onUnavailable hands the cell back to our
// own Google button.
export default function GoogleButton({ signingUp = false, onError, onUnavailable }) {
  const box = useRef(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let gone = false;
    let drawnWidth = 0;
    onCredential = async (credential, nonce) => {
      setBusy(true);
      const { error } = await getSupabase().auth.signInWithIdToken({ provider: "google", token: credential, nonce });
      if (error) {
        setBusy(false);
        onError?.(`Google ${signingUp ? "sign-up" : "sign-in"} didn't work. Please try again, or ${signingUp ? "sign up" : "log in"} with your email.`);
        return;
      }
      const next = safeNext(new URLSearchParams(window.location.search).get("next"), AUTH_ROUTES.afterLogin);
      window.location.assign(`/auth/confirm?via=google&next=${encodeURIComponent(next)}`);
    };
    const draw = () => {
      const el = box.current;
      if (gone || !el) return;
      // Google draws its button 1px wider on each side than the width it is given: ask for 2px less, so it fits its cell
      const width = Math.min(400, Math.floor(el.clientWidth) - 2);
      if (width <= 0 || width === drawnWidth) return;
      drawnWidth = width;
      el.replaceChildren();
      window.google.accounts.id.renderButton(el, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: signingUp ? "signup_with" : "continue_with",
        logo_alignment: "center",
        width,
        locale: "en-GB",
      });
    };
    let ro = null;
    let timer = null;
    setUp()
      .then(() => {
        if (gone || !box.current) return;
        draw();
        ro = new ResizeObserver(draw);
        ro.observe(box.current);
        timer = setTimeout(() => {
          if (!gone && !box.current?.querySelector("iframe")) onUnavailable?.();
        }, 3000);
      })
      .catch(() => {
        if (!gone) onUnavailable?.();
      });
    return () => {
      gone = true;
      ro?.disconnect();
      clearTimeout(timer);
    };
  }, [signingUp]);
  return <div ref={box} className={`rt-auth__google${busy ? " is-busy" : ""}`} aria-busy={busy || undefined}></div>;
}
