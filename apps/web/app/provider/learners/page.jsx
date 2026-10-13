import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderLearners from "@/components/providerWorkspace/ProviderLearners";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: learners (components/providerWorkspace/ProviderLearners; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.learners;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/learners", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="learners" title={p.title} lead={p.lead}>
      <ProviderLearners />
    </ProviderShell>
  );
}
