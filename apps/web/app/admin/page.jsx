import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: dashboard (components/admin; copy: data/admin.js; reads and writes: lib/admin.js). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.dashboard.title} | ${A.title}`, description: A.dashboard.lead, path: "/admin", noindex: true });

export default function Page() {
  return (
    <AdminShell current="dashboard" title={A.dashboard.title} lead={A.dashboard.lead}>
      <AdminDashboard />
    </AdminShell>
  );
}
