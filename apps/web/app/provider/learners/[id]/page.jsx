import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderLearner from "@/components/providerWorkspace/ProviderLearner";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: one learner (components/providerWorkspace/ProviderLearner). Private, so kept out of search.
const p = pw.pages.learner;
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: `${p.title} | ${pw.title}`, description: pw.pages.learners.lead, path: `/provider/learners/${id}`, noindex: true });
}

export default async function Page(props) {
  const { id } = await props.params;
  return (
    <ProviderShell current="learners" title={p.title} back={{ label: "Learners", href: "/provider/learners" }}>
      <ProviderLearner learnerId={id} />
    </ProviderShell>
  );
}
