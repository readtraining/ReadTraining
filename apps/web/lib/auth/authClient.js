"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { AUTH_ROUTES } from "@/lib/routes";

// Auth through Supabase Auth (email and password; the project requires email confirmation). The log in, sign up, forgot and reset
// password screens only depend on these functions: each resolves on success and throws an Error with a message people can act on.
// Supabase's own messages are mapped to the site's wording. Email links come back through /auth/callback.

// The auth pages' addresses live in lib/routes.js (server pages read them too); re-exported for the auth screens.
export { AUTH_ROUTES };

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const callbackUrl = (next) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

// Supabase error codes and messages, as the site says them
function friendly(error, fallback) {
  const code = error?.code || "";
  const text = (error?.message || "").toLowerCase();
  if (code === "invalid_credentials" || text.includes("invalid login credentials")) return "Incorrect email or password. Please try again.";
  if (code === "email_not_confirmed" || text.includes("email not confirmed")) return "Confirm your email first. Open the link we sent you, or ask for a new one below.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || text.includes("rate limit")) return "Too many attempts. Please wait a few minutes and try again.";
  if (code === "weak_password" || text.includes("password should")) return "Choose a stronger password: at least 8 characters, with letters and numbers.";
  if (code === "same_password") return "Choose a new password that is different from your current one.";
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
  const { error } = await getSupabase().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: callbackUrl(AUTH_ROUTES.afterLogin) } });
  if (error) throw fail(error, "We couldn't send the link. Please try again.");
}

// Google and Facebook are not switched on in the Supabase project yet (Authentication > Sign In / Providers).
export async function loginWithProvider(provider) {
  const name = provider === "facebook" ? "Facebook" : "Google";
  throw new Error(`${name} sign-in isn't available yet. Please log in with your email.`);
}

// Sends the reset email; its link opens /reset-password signed in for that one change. Says nothing about whether the
// email has an account, so the form cannot be used to find out who is registered.
export async function requestPasswordReset({ email }) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl(AUTH_ROUTES.resetPassword) });
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
      emailRedirectTo: callbackUrl(next || AUTH_ROUTES.afterLogin),
      data: { first_name: firstName.trim(), last_name: lastName.trim(), marketing_opt_in: Boolean(marketingOptIn), ...(intent ? { signup_intent: intent } : {}) },
    },
  });
  if (error) throw fail(error, "We couldn't create your account. Please try again.");
  return { email: email.trim(), needsConfirmation: !data.session };
}

export async function signUpWithProvider(provider) {
  const name = provider === "facebook" ? "Facebook" : "Google";
  throw new Error(`${name} sign-up isn't available yet. Please sign up with your email.`);
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  await getSupabase().auth.signOut();
}

// The signed-in person as the site shows them: { id, email, firstName, lastName, name } or null; undefined while loading.
export const toPerson = (user) => {
  if (!user) return null;
  const m = user.user_metadata || {};
  const firstName = m.first_name || "";
  const lastName = m.last_name || "";
  return { id: user.id, email: user.email, firstName, lastName, name: [firstName, lastName].filter(Boolean).join(" ") || user.email };
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
