import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminLearnerList from "@/components/admin/AdminLearnerList";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: learners (components/admin/AdminLearnerList), each opening their record. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.learners.title} | ${A.title}`, description: A.learners.lead, path: "/admin/learners", noindex: true });

export default function Page() {
  return (
    <AdminShell current="learners" title={A.learners.title} lead={A.learners.lead}>
      <AdminLearnerList />
    </AdminShell>
  );
}
