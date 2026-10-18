import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminProvider from "@/components/admin/AdminProvider";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: one provider (components/admin/AdminProvider). Private, so kept out of search.
export async function generateMetadata(props) {
  const { slug } = await props.params;
  return pageMetadata({ title: `Provider | ${A.title}`, description: A.providers.lead, path: `/admin/providers/${slug}`, noindex: true });
}

export default async function Page(props) {
  const { slug } = await props.params;
  return (
    <AdminShell current="providers" title={A.providers.title} detail="Provider">
      <AdminProvider slug={slug} />
    </AdminShell>
  );
}
