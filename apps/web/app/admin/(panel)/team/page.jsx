import React from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminTeam from "@/components/admin/AdminTeam";
import { EmptyState } from "@/components/states/States";
import { admin as A } from "@/data/admin";
import { getAdminAccess } from "@/lib/adminAccess";
import { pageMetadata } from "@/lib/seo";

// Admin Users & Roles (components/admin/AdminTeam): only for admins with the "admins" switch; the API checks it again on every
// call. Private, so kept out of search.
export const metadata = pageMetadata({ title: `${A.team.title} | ${A.title}`, description: A.team.lead, path: "/admin/team", noindex: true });

export default async function Page() {
  const me = await getAdminAccess();
  return (
    <AdminShell current="team" title={A.team.title} lead={A.team.lead}>
      {me?.permissions.includes("admins") ? <AdminTeam /> : <EmptyState title="You don't have access to the admin team." text="Ask a Full admin if you need it." />}
    </AdminShell>
  );
}
