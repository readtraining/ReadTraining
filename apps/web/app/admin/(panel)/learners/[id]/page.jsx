import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminLearner from "@/components/admin/AdminLearner";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: one learner (components/admin/AdminLearner). Private, so kept out of search.
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: `Learner | ${A.title}`, description: A.learners.lead, path: `/admin/learners/${id}`, noindex: true });
}

export default async function Page(props) {
  const { id } = await props.params;
  return (
    <AdminShell current="learners" title={A.learners.title}>
      <AdminLearner id={id} />
    </AdminShell>
  );
}
