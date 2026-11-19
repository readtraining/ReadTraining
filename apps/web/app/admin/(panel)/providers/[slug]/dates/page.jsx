import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminProviderDates } from "@/components/admin/AdminStaffPages";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: a provider's dates, edited from the admin by an admin's own switches (components/admin/StaffEdit.jsx).
// Private, so kept out of search.
export async function generateMetadata(props) {
  const { slug } = await props.params;
  return pageMetadata({ title: `Dates | ${A.title}`, description: A.providers.lead, path: `/admin/providers/${slug}/dates`, noindex: true });
}

export default async function Page(props) {
  const { slug } = await props.params;
  return (
    <AdminShell current="providers" title={A.providers.title} detail="Dates" real>
      <AdminProviderDates slug={slug} />
    </AdminShell>
  );
}
