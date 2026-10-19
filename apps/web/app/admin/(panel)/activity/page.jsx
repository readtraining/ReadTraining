import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminActivity from "@/components/admin/AdminActivity";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// The activity log viewer (components/admin/AdminActivity), for every admin. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.activity.title} | ${A.title}`, description: A.activity.lead, path: "/admin/activity", noindex: true });

export default function Page() {
  return (
    <AdminShell current="activity" title={A.activity.title} lead={A.activity.lead}>
      <AdminActivity />
    </AdminShell>
  );
}
