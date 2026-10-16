import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminCandidate from "@/components/admin/AdminCandidate";
import { admin as A } from "@/data/admin";
import { adminWork as W } from "@/data/adminWork";
import { pageMetadata } from "@/lib/seo";

// Platform admin, Phase 2: one record (components/admin/AdminCandidate). Private, so kept out of search.
export async function generateMetadata(props) {
  const { ref } = await props.params;
  return pageMetadata({ title: `Candidate ${ref} | ${A.title}`, description: W.jobs.lead, path: `/admin/jobs/${ref}`, noindex: true });
}

export default async function Page(props) {
  const { ref } = await props.params;
  return (
    <AdminShell current="jobs" title={W.jobs.title}>
      <AdminCandidate reference={ref} />
    </AdminShell>
  );
}
