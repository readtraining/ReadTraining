import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderCourseOverview from "@/components/providerWorkspace/ProviderCourseOverview";
import { CourseTitle } from "@/components/providerWorkspace/ProviderCourseEditor";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: one course's overview (Hurak's course Details: components/providerWorkspace/ProviderCourseOverview), with its
// learners, venues, cohorts, packages and orders. Gated as the editor is: the layout lets in members of a provider only, and the
// API answers only for this provider's own course. Private, so kept out of search.
const p = pw.pages.courseOverview;
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: `${p.title} | ${pw.title}`, description: pw.pages.courses.lead, path: `/provider/courses/${id}/overview`, noindex: true });
}

export default async function Page(props) {
  const { id } = await props.params;
  return (
    <ProviderShell current="courses" title={<CourseTitle courseId={id} fallback={p.title} />} back={{ label: "Courses", href: "/provider/courses" }}>
      <ProviderCourseOverview courseId={id} />
    </ProviderShell>
  );
}
