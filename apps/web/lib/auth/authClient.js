"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { AUTH_ROUTES } from "@/lib/routes";
import { safeNext } from "@/lib/safeNext";

// Auth through Supabase Auth (email and password; the project requires email confirmation). The log in, sign up, forgot and reset
// password screens only depend on these functions: each resolves on success and throws an Error with a message people can act on.
// Supabase's own messages are mapped to the site's wording. Email links come back through /auth/confirm, which signs the
// person in and continues to `next`; the email templates build the link from {{ .RedirectTo }} plus the token hash.

// The auth pages' addresses live in lib/routes.js (server pages read them too); re-exported for the auth screens.
export { AUTH_ROUTES };

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const confirmUrl = (next) => `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;

// Supabase error codes and messages, as the site says them
function friendly(error, fallback) {
  const code = error?.code || "";
  const text = (error?.message || "").toLowerCase();
  if (code === "invalid_credentials" || text.includes("invalid login credentials")) return "Incorrect email or password. Please try again.";
  if (code === "email_not_confirmed" || text.includes("email not confirmed")) return "Confirm your email first. Open the link we sent you, or ask for a new one below.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || text.includes("rate limit")) return "Too many attempts. Please wait a few minutes and try again.";
  // same_password first: its message ("New password should be different…") also contains "password should"
  if (code === "same_password" || text.includes("different from the old password")) return "Choose a new password that is different from your current one.";
  if (code === "weak_password" || text.includes("password should")) return "Choose a stronger password: at least 8 characters, with letters and numbers.";
  if (code === "user_already_exists" || text.includes("already registered")) return "An account with this email already exists. Try logging in instead.";
  if (text.includes("failed to fetch") || text.includes("network")) return "We couldn't reach the server. Check your connection and try again.";
  return fallback;
}
const fail = (error, fallback) => {
  const e = new Error(friendly(error, fallback));
  e.code = error?.code || (String(error?.message || "").toLowerCase().includes("email not confirmed") ? "email_not_confirmed" : undefined);
  return e;
};

export async function loginWithPassword({ email, password }) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw fail(error, "We couldn't log you in. Please try again.");
  return data.user;
}

// Email confirmation link sent again (log in shows this when the email is not confirmed yet)
export async function resendConfirmation({ email }) {
  const { error } = await getSupabase().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: confirmUrl(AUTH_ROUTES.afterLogin) } });
  if (error) throw fail(error, "We couldn't send the link. Please try again.");
}

// Google (and Facebook once Meta has verified the business) through Supabase: the browser goes to the provider and comes back
// to /auth/callback?next=… signed in, with the profile's name and photo from the provider. Supabase is asked first whether
// the provider is switched on (Authentication > Sign In / Providers), so a provider that isn't set up shows a message here
// instead of Supabase's error page. On success the browser leaves the page, so this only returns on a problem.
async function providerEnabled(provider) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } });
    return Boolean((await res.json())?.external?.[provider]);
  } catch {
    return false;
  }
}
async function socialSignIn(provider, next, signingUp) {
  const name = provider === "facebook" ? "Facebook" : "Google";
  const with_ = signingUp ? "sign up with your email" : "log in with your email";
  if (!isSupabaseConfigured || !(await providerEnabled(provider))) throw new Error(`${name} ${signingUp ? "sign-up" : "sign-in"} isn't available yet. Please ${with_}.`);
  const back = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next, AUTH_ROUTES.afterLogin))}`;
  const { error } = await getSupabase().auth.signInWithOAuth({ provider, options: { redirectTo: back } });
  if (error) throw fail(error, `${name} ${signingUp ? "sign-up" : "sign-in"} didn't work. Please try again, or ${with_}.`);
}
export const loginWithProvider = (provider, next) => socialSignIn(provider, next, false);

// Sends the reset email; its link opens /reset-password signed in for that one change. Says nothing about whether the
// email has an account, so the form cannot be used to find out who is registered.
export async function requestPasswordReset({ email }) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: confirmUrl(AUTH_ROUTES.resetPassword) });
  if (error) throw fail(error, "We couldn't send the reset email. Please try again.");
  return { email };
}

// The new password, on /reset-password (the email link has signed the person in).
export async function resetPassword({ password }) {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("This reset link has expired or was already used. Ask for a new one.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw fail(error, "We couldn't change your password. Please try again.");
}

// Creates the account with the name and marketing choice, and sends the confirmation email. `needsConfirmation` is true until
// the link is opened (always, while the project requires confirmation). For an email that already has an account Supabase
// returns no error and sends nothing, so the screen says the same either way. `next` is where the email link continues to
// (the account by default; provider onboarding from "Become a provider"), and `intent` records why the account was made.
export async function registerAccount({ firstName, lastName, email, password, marketingOptIn, next, intent }) {
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: confirmUrl(next || AUTH_ROUTES.afterLogin),
      data: { first_name: firstName.trim(), last_name: lastName.trim(), marketing_opt_in: Boolean(marketingOptIn), ...(intent ? { signup_intent: intent } : {}) },
    },
  });
  if (error) throw fail(error, "We couldn't create your account. Please try again.");
  return { email: email.trim(), needsConfirmation: !data.session };
}

export const signUpWithProvider = (provider, next) => socialSignIn(provider, next, true);

export async function signOut() {
  if (!isSupabaseConfigured) return;
  await getSupabase().auth.signOut();
}

// The signed-in person as the site shows them: { id, email, firstName, lastName, name } or null; undefined while loading.
export const toPerson = (user) => {
  if (!user) return null;
  const m = user.user_metadata || {};
  // email sign-up (and Account settings) save first_name / last_name; Google and Facebook send one full name, split as the
  // database splits it for the profile (first word, then the rest)
  const full = String(m.full_name || m.name || "").trim();
  const space = full.indexOf(" ");
  const firstName = m.first_name || (space > 0 ? full.slice(0, space) : full);
  const lastName = m.first_name ? m.last_name || "" : space > 0 ? full.slice(space + 1).trim() : "";
  // Google's photo comes with the sign-in, so account cards can show it before the saved profile has loaded
  const avatarUrl = m.avatar_url || m.picture || "";
  return { id: user.id, email: user.email, firstName, lastName, avatarUrl, name: [firstName, lastName].filter(Boolean).join(" ") || user.email };
};
export function useAuthUser() {
  const [person, setPerson] = useState(undefined);
  useEffect(() => {
    // no Supabase settings (a deployment without them): nobody is signed in, and nothing throws
    if (!isSupabaseConfigured) {
      setPerson(null);
      return undefined;
    }
    const supabase = getSupabase();
    supabase.auth.getUser().then(({ data }) => setPerson(toPerson(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setPerson(toPerson(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);
  return person;
}
