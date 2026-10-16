import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminRequest from "@/components/admin/AdminRequest";
import { admin as A } from "@/data/admin";
import { adminWork as W } from "@/data/adminWork";
import { pageMetadata } from "@/lib/seo";

// Platform admin, Phase 2: one record (components/admin/AdminRequest). Private, so kept out of search.
export async function generateMetadata(props) {
  const { ref } = await props.params;
  return pageMetadata({ title: `Request ${ref} | ${A.title}`, description: W.requests.lead, path: `/admin/requests/${ref}`, noindex: true });
}

export default async function Page(props) {
  const { ref } = await props.params;
  return (
    <AdminShell current="requests" title={W.requests.title}>
      <AdminRequest reference={ref} />
    </AdminShell>
  );
}
