import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminProviderProfile } from "@/components/admin/AdminStaffPages";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: a provider's profile and venues, edited from the admin by an admin's own switches (components/admin/StaffEdit.jsx).
// Private, so kept out of search.
export async function generateMetadata(props) {
  const { slug } = await props.params;
  return pageMetadata({ title: `Profile and venues | ${A.title}`, description: A.providers.lead, path: `/admin/providers/${slug}/profile`, noindex: true });
}

export default async function Page(props) {
  const { slug } = await props.params;
  return (
    <AdminShell current="providers" title={A.providers.title} detail="Profile and venues" parent={{ label: "Provider", href: `/admin/providers/${slug}` }} real>
      <AdminProviderProfile slug={slug} />
    </AdminShell>
  );
}
