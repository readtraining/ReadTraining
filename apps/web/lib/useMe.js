"use client";

import { useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { signOut, useAuthUser } from "@/lib/auth/authClient";

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
    // on an account area the page can't work, so go to log in; on a public page (the header reads this too) just sign out
    const inAccountArea = /^\/(account|business|provider|admin)(\/|$)/.test(window.location.pathname);
    signOut()
      .catch(() => {})
      .finally(() => inAccountArea && window.location.replace(`/login?next=${encodeURIComponent(here)}&ended=1`));
  }, [ended]);
  return { person, ...query };
}

// A failed save, as the form shows it: the message for each field that was refused, plus one general message.
export function errorsFrom(error) {
  const data = error?.data ?? {};
  const fields = {};
  for (const [name, messages] of Object.entries(data.zodError?.fieldErrors ?? {})) if (messages?.length) fields[name] = messages[0];
  if (data.field) fields[data.field] = error.message;
  const general = Object.keys(fields).length ? "" : error?.message && !/fetch|network/i.test(error.message) && data.code !== "INTERNAL_SERVER_ERROR" ? error.message : "We couldn't save that. Check your connection and try again.";
  return { fields, general };
}
