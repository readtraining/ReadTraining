import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderCourses, { CoursesProfile, NewCourseButton } from "@/components/providerWorkspace/ProviderCourses";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: courses (components/providerWorkspace/ProviderCourses; copy: data/providerWorkspace.js; records: the API, provider.courses).
// Private, so kept out of search; proxy.js sends signed-out visitors to log in.
const p = pw.pages.courses;
export const metadata = pageMetadata({ title: `${p.title} | ${pw.title}`, description: p.lead, path: "/provider/courses", noindex: true });

export default function Page() {
  return (
    <ProviderShell current="courses" title={p.title} lead={p.lead} actions={<div className="rt-cx-head"><CoursesProfile /><NewCourseButton /></div>}>
      <ProviderCourses />
    </ProviderShell>
  );
}
