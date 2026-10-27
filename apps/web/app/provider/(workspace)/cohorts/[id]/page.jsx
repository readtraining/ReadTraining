import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderCohort, { CohortTitle } from "@/components/providerWorkspace/ProviderCohort";
import ProviderCohortDetail, { CohortDetailTitle } from "@/components/providerWorkspace/ProviderCohortDetail";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: one cohort. Real cohorts (from the API) have uuid ids; the sample orders and learners pages still link to
// their sample cohorts (DEMO, components/providerWorkspace/ProviderCohort) until bookings are real. Private, so kept out of search.
const p = pw.pages.cohort;
const isCohortId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(id));
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: `${p.title} | ${pw.title}`, description: pw.pages.cohorts.lead, path: `/provider/cohorts/${id}`, noindex: true });
}

export default async function Page(props) {
  const { id } = await props.params;
  const real = isCohortId(id);
  return (
    <ProviderShell current="cohorts" title={real ? <CohortDetailTitle cohortId={id} fallback={p.title} /> : <CohortTitle cohortId={id} fallback={p.title} />} back={{ label: "Cohorts", href: "/provider/cohorts" }}>
      {real ? <ProviderCohortDetail cohortId={id} /> : <ProviderCohort cohortId={id} />}
    </ProviderShell>
  );
}
