import React from "react";
import ProviderShell from "@/components/providerWorkspace/ProviderShell";
import ProviderCourseEditor, { CourseTitle } from "@/components/providerWorkspace/ProviderCourseEditor";
import { pw } from "@/data/providerWorkspace";
import { pageMetadata } from "@/lib/seo";

// Provider workspace: one course (components/providerWorkspace/ProviderCourseEditor). Private, so kept out of search.
const p = pw.pages.course;
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: `${p.title} | ${pw.title}`, description: pw.pages.courses.lead, path: `/provider/courses/${id}`, noindex: true });
}

export default async function Page(props) {
  const { id } = await props.params;
  return (
    <ProviderShell current="courses" title={<CourseTitle courseId={id} fallback={p.title} />} back={{ label: "Courses", href: "/provider/courses" }}>
      <ProviderCourseEditor courseId={id} />
    </ProviderShell>
  );
}
