"use client";

import { useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { signOut, useAuthUser } from "@/lib/auth/authClient";
import { AUTH_ROUTES } from "@/lib/routes";

// The signed-in person from the API (me.get): profile, email and whether it's verified, a pending email change, the
// identities they can switch between. One cached query shared by every account component; `refetch()` after a save.
// `person` is undefined while the sign-in is read, null when signed out (then no request is made).
// If the API says the session has ended (signed out on another device after a password change, banned, deleted), this
// browser is signed out too and sent to log in, instead of showing pages whose data can no longer load.
export function useMe() {
  const person = useAuthUser();
  const query = api.me.get.useQuery(undefined, {
    enabled: Boolean(person),
    staleTime: 60_000,
    retry: (count, error) => error?.data?.code !== "UNAUTHORIZED" && count < 1,
  });
  // (Supabase's own client may already have signed this browser out locally when it noticed; a normal "Sign out" never
  // gets here, because no request is made once signed out.)
  const ended = query.error?.data?.code === "UNAUTHORIZED";
  useEffect(() => {
    if (!ended) return;
    const here = window.location.pathname + window.location.search;
    // on an account area the page can't work, so go to log in (an admin to the admin sign-in); on a public page (the header
    // reads this too) just sign out
    const inAccountArea = /^\/(account|business|provider|admin)(\/|$)/.test(window.location.pathname);
    const login = /^\/admin(\/|$)/.test(window.location.pathname) ? AUTH_ROUTES.adminLogin : AUTH_ROUTES.login;
    signOut()
      .catch(() => {})
      .finally(() => inAccountArea && window.location.replace(`${login}?next=${encodeURIComponent(here)}&ended=1`));
  }, [ended]);
  return { person, ...query };
}

// The API's bare codes, said in words: a session that ended (signed out elsewhere, blocked, expired; useMe then sends the page to
// log in, so the person is told to keep their text first), and a refusal with no message of its own.
const PLAIN = {
  UNAUTHORIZED: "You've been signed out, so this wasn't saved. Copy any text you want to keep, then log in again.",
  FORBIDDEN: "You don't have permission to do that.",
};

// A failed save, as the form shows it: the message for each field that was refused, plus one general message.
export function errorsFrom(error) {
  const data = error?.data ?? {};
  const fields = {};
  for (const [name, messages] of Object.entries(data.zodError?.fieldErrors ?? {})) if (messages?.length) fields[name] = messages[0];
  if (data.field) fields[data.field] = error.message;
  const bare = PLAIN[data.code] && (data.code === "UNAUTHORIZED" || error?.message === data.code);
  const general = Object.keys(fields).length
    ? ""
    : bare
      ? PLAIN[data.code]
      : error?.message && !/fetch|network/i.test(error.message) && data.code !== "INTERNAL_SERVER_ERROR"
        ? error.message
        : "We couldn't save that. Check your connection and try again.";
  return { fields, general };
}
