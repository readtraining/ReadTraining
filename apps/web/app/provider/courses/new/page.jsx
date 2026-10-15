import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderNewCourse from "@/components/providerWorkspace/ProviderNewCourse";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: newCourse (components/providerWorkspace/ProviderNewCourse; copy: data/providerWorkspace.js; records: lib/providerWorkspace.js).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.newCourse;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/courses/new", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="courses" title={p.title} lead={p.lead} back={{ label: "Courses", href: "/provider/courses" }}>
      <ProviderNewCourse />
    </ProviderShell>
  );
}
