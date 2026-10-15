import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminBusiness from "@/components/admin/AdminBusiness";
import { admin as A } from "@/data/admin";
import { adminWork as W } from "@/data/adminWork";
import { pageMetadata } from "@/lib/seo";

// Platform admin, Phase 2: one record (components/admin/AdminBusiness). Private, so kept out of search.
export async function generateMetadata(props) {
  const { slug } = await props.params;
  return pageMetadata({ title: `Business account | ${A.title}`, description: W.businesses.lead, path: `/admin/businesses/${slug}`, noindex: true });
}

export default async function Page(props) {
  const { slug } = await props.params;
  return (
    <AdminShell current="businesses" title={W.businesses.title}>
      <AdminBusiness slug={slug} />
    </AdminShell>
  );
}
