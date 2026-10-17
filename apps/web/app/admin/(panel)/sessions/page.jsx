import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminSessions from "@/components/admin/AdminSessions";
import { admin as A } from "@/data/admin";
import { pageMetadata } from "@/lib/seo";

// Platform admin: sessions and venues (components/admin/AdminSessions). Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.sessions.title} | ${A.title}`, description: A.sessions.lead, path: "/admin/sessions", noindex: true });

export default function Page() {
  return (
    <AdminShell current="sessions" title={A.sessions.title} lead={A.sessions.lead}>
      <AdminSessions />
    </AdminShell>
  );
}
