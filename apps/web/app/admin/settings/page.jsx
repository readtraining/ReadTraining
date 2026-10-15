import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminSettings from "@/components/admin/AdminSettings";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: settings and audit (components/admin/AdminSettings). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.settings.title} | ${A.title}`, description: A.settings.lead, path: "/admin/settings", noindex: true });

export default function Page() {
  return (
    <AdminShell current="settings" title={A.settings.title} lead={A.settings.lead}>
      <AdminSettings />
    </AdminShell>
  );
}
