import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminCourse from "@/components/admin/AdminCourse";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: one course (components/admin/AdminCourse). Private, so kept out of search.
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: `Course | ${A.title}`, description: A.catalogue.lead, path: `/admin/catalogue/${id}`, noindex: true });
}

export default async function Page(props) {
  const { id } = await props.params;
  return (
    <AdminShell current="catalogue" title={A.catalogue.title}>
      <AdminCourse id={id} />
    </AdminShell>
  );
}
