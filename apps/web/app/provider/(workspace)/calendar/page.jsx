import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderCalendar from "@/components/providerWorkspace/ProviderCalendar";
import { CohortViews } from "@/components/providerWorkspace/providerParts";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: calendar (components/providerWorkspace/ProviderCalendar; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.calendar;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/calendar", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="cohorts" title={p.title} lead={p.lead} actions={<CohortViews current="calendar" />}>
      <ProviderCalendar />
    </ProviderShell>
  );
}
