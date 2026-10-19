import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminPlatform from "@/components/admin/AdminPlatform";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: Platform settings (components/admin/AdminPlatform). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.platform.title} | ${A.title}`, description: A.platform.lead, path: "/admin/platform", noindex: true });

export default function Page() {
  return (
    <AdminShell current="platform" title={A.platform.title} lead={A.platform.lead}>
      <AdminPlatform />
    </AdminShell>
  );
}
