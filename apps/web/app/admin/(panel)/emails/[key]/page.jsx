import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminEmail from "@/components/admin/AdminEmail";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: one automated email's words, with a preview and a test (components/admin/AdminEmail). Private.
export async function generateMetadata(props) {
  const { key } = await props.params;
  return pageMetadata({ title: `${A.emails.title} | ${A.title}`, description: A.emails.lead, path: `/admin/emails/${key}`, noindex: true });
}

export default async function Page(props) {
  const { key } = await props.params;
  return (
    <AdminShell current="emails" title={A.emails.title} detail="Edit email">
      <AdminEmail templateKey={key} />
    </AdminShell>
  );
}
