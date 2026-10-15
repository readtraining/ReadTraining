import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderCohorts from "@/components/providerWorkspace/ProviderCohorts";
import { CohortViews } from "@/components/providerWorkspace/providerParts";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: cohorts (components/providerWorkspace/ProviderCohorts; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.cohorts;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/cohorts", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="cohorts" title={p.title} lead={p.lead} actions={<CohortViews current="list" />}>
      <ProviderCohorts />
    </ProviderShell>
  );
}
