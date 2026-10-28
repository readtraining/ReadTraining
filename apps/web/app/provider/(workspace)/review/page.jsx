import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderReview from "@/components/providerWorkspace/ProviderReview";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: account review (components/providerWorkspace/ProviderReview; copy: data/providerWorkspace.js; from the API).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.review;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/review", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="review" title={p.title} lead={p.lead} back={{ label: "Dashboard", href: "/provider" }}>
      <ProviderReview />
    </ProviderShell>
  );
}
