import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import ProviderCourseEditor from "@/components/providerWorkspace/ProviderCourseEditor";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: write a shared course page, in the same editor providers use for their courses (scope "admin": no prices or
// dates, changes go live on Save, published from here). Private, so kept out of search.
export async function generateMetadata(props) {
  const { id } = await props.params;
  return pageMetadata({ title: `Edit shared page | ${A.title}`, description: A.catalogue.lead, path: `/admin/catalogue/${id}/edit`, noindex: true });
}

export default async function Page(props) {
  const { id } = await props.params;
  return (
    <AdminShell current="catalogue" title={A.catalogue.title} detail="Edit shared page" real>
      <ProviderCourseEditor courseId={id} scope="admin" />
    </AdminShell>
  );
}
