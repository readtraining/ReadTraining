"use client";

// Cloudflare Turnstile, the "are you human?" check, for the forms bots attack: sign-up, sign-in, forgot password (Supabase
// checks the token: its CAPTCHA protection) and every public form that sends to us (lib/forms.js sendForm; the API checks it).
// It runs invisibly when the form is sent; only in the rare case Cloudflare isn't sure does a small box appear at the bottom of
// the screen for one click. Each token is used once.
//
// The live site uses the ReadTraining widget (NEXT_PUBLIC_TURNSTILE_SITE_KEY, production only). Preview and development
// copies without it use Cloudflare's published test site key, which always passes (with the matching test secret).
const TEST_SITE_KEY = "1x00000000000000000000AA";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TEST_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading = null;
function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
      s.onerror = () => {
        loading = null;
        reject(new Error("turnstile"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// Starts loading Cloudflare's script when a protected form opens, so sending isn't kept waiting.
export function preloadHumanCheck() {
  loadTurnstile().catch(() => {});
}

const FAILED = "We couldn't confirm you're a person. Please check your connection and try again.";

/** A fresh one-use token for this submission. Rejects with a message the form can show. */
export async function getHumanCheck() {
  let turnstile;
  try {
    turnstile = await loadTurnstile();
  } catch {
    throw new Error(FAILED);
  }
  return new Promise((resolve, reject) => {
    const box = document.createElement("div");
    box.className = "rt-humancheck";
    document.body.appendChild(box);
    let id;
    const finish = (fn, value) => {
      try {
        turnstile.remove(id);
      } catch {}
      box.remove();
      fn(value);
    };
    id = turnstile.render(box, {
      sitekey: SITE_KEY,
      appearance: "interaction-only",
      callback: (token) => finish(resolve, token),
      "error-callback": () => finish(reject, new Error(FAILED)),
      "timeout-callback": () => finish(reject, new Error(FAILED)),
    });
  });
}
