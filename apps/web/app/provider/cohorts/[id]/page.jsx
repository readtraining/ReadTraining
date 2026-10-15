import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderCohort from "@/components/providerWorkspace/ProviderCohort";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: one cohort (components/providerWorkspace/ProviderCohort). Private, so kept out of search.
const p = pw.pages.cohort;
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: `${p.title} | ${pw.title}`, description: pw.pages.cohorts.lead, path: `/provider/cohorts/${id}`, noindex: true });
}

export default async function Page(props) {
  const { id } = await props.params;
  return (
    <ProviderShell current="cohorts" title={p.title} back={{ label: "Cohorts", href: "/provider/cohorts" }}>
      <ProviderCohort cohortId={id} />
    </ProviderShell>
  );
}
