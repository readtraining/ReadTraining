"use client";

import { provider } from "@/data/provider";
import { useMe } from "@/lib/useMe";
import { CtaLink } from "@/components/marketing/parts";

// The For providers page's main button for someone who already has a provider account: their own next step (their application,
// or "Manage your courses") instead of "Become a provider", which would ask them to create an account they already have.
// Signed out, without a provider account, or with a rejected application (the API leaves that one out of their identities), it
// stays "Become a provider" and opens the sign-up pop-up. `known`: whether we know yet. Signed out is known at once; for someone
// signed in it waits for their account (me.get), and until then the button keeps its place unseen (.rt-cta-wait), so it never
// shows the wrong words or does nothing when clicked.
export function useProviderStep() {
  const { person, data, isFetched } = useMe();
  // only while someone is signed in: after signing out on this page (no reload) the last account stays in memory, and must not
  // keep showing "Manage your courses" to a signed-out visitor
  const mine = person ? data?.identities?.find((i) => i.kind === "provider") : null;
  return { known: person === null || isFetched, step: mine ? provider.account[mine.status] ?? null : null };
}

/** The hero's main button (`link` is "Become a provider"). */
export function ProviderHeroCta({ link }) {
  const { known, step } = useProviderStep();
  if (!known) {
    return (
      <span className="rt-cta-wait" aria-hidden="true">
        <CtaLink link={link} />
      </span>
    );
  }
  return <CtaLink link={step ?? link} />;
}
