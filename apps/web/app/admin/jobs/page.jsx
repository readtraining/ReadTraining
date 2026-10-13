import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminJobs from "@/components/admin/AdminJobs";
import { admin as A } from "@/data/admin";
import { adminWork as W } from "@/data/adminWork";
import { pageMetadata } from "@/lib/seo";

// Platform admin, Phase 2: Security Jobs (components/admin/AdminJobs). Private, so kept out of search.
export const metadata = pageMetadata({ title: `Security Jobs | ${A.title}`, description: W.jobs.lead, path: "/admin/jobs", noindex: true });

export default function Page() {
  return (
    <AdminShell current="jobs" title={W.jobs.title} lead={W.jobs.lead}>
      <AdminJobs />
    </AdminShell>
  );
}
