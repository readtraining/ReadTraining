import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderPackages from "@/components/providerWorkspace/ProviderPackages";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: price plans (components/providerWorkspace/ProviderPackages; copy: data/providerWorkspace.js; records: API provider.plans).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.packages;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/packages", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="courses" title={p.title} lead={p.lead} back={{ label: "Courses", href: "/provider/courses" }}>
      <ProviderPackages />
    </ProviderShell>
  );
}
