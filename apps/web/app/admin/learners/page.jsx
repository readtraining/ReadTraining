import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminLearners from "@/components/admin/AdminLearners";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: learners and certificates (components/admin/AdminLearners). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.learners.title} | ${A.title}`, description: A.learners.lead, path: "/admin/learners", noindex: true });

export default function Page() {
  return (
    <AdminShell current="learners" title={A.learners.title} lead={A.learners.lead}>
      <AdminLearners />
    </AdminShell>
  );
}
