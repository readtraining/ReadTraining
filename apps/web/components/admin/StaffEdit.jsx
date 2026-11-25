"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/states/States";
import { useAdminAccess } from "@/lib/adminContext";
import { api } from "@/lib/trpc/react";
import { errorText } from "@/lib/useMe";
import { WorkspaceProvider } from "@/lib/workspaceContext";
import { DetailSkeleton } from "./adminParts";

// An admin editing a provider's work from the admin (its course, dates, price plans, profile, terms, venues), by their own
// switches: the provider's own editors, shown here inside the admin, never in the provider's workspace. Opening one starts a
// staff session for that provider, with no form (API admin.staff; the provider's owner is emailed one summary of the changes
// when the admin finishes, or after two hours unused). `provider`: { id, name, slug, status }. Links inside the editors lead to
// the admin's pages.
export default function StaffEdit({ provider, children }) {
  const me = useAdminAccess();
  const router = useRouter();
  const utils = api.useUtils();
  const current = api.admin.staff.current.useQuery(undefined, { retry: false });
  const start = api.admin.staff.start.useMutation();
  const end = api.admin.staff.end.useMutation();
  const editing = current.data?.organisationId === provider?.id;
  // not editing this provider yet: start (once), then the editors load
  useEffect(() => {
    if (!provider || current.isLoading || current.isError || editing || start.isPending || start.isError) return;
    start.mutate({ organisationId: provider.id }, { onSuccess: () => utils.admin.staff.current.invalidate() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider?.id, current.isLoading, current.isError, editing]);
  // the editors' pop-ups open at the end of <body>: they take the provider workspace's form look
  useEffect(() => {
    document.body.classList.add("rt-pws-open");
    return () => document.body.classList.remove("rt-pws-open");
  }, []);
  const slug = provider?.slug;
  const value = useMemo(() => provider && {
    id: provider.id,
    name: provider.name,
    slug,
    status: provider.status,
    statusNote: null,
    type: "provider",
    role: "admin",
    userId: me?.id,
    staff: { pricing: Boolean(me?.permissions?.includes("pricing")), content: Boolean(me?.permissions?.includes("approve")) },
    links: {
      courses: () => `/admin/providers/${slug}`,
      course: (id, tab) => `/admin/catalogue/${id}/edit${tab ? `?tab=${tab}` : ""}`,
      preview: (id) => `/admin/catalogue/${id}/preview`,
      plans: () => `/admin/providers/${slug}/plans`,
      dates: (courseId) => `/admin/providers/${slug}/dates${courseId ? `?course=${courseId}` : ""}`,
      cohort: () => null,
    },
  }, [provider, slug, me]);

  if (current.isError) return <ErrorState onRetry={() => current.refetch()} />;
  if (start.isError) return <ErrorState title={errorText(start.error)} onRetry={() => start.reset()} />;
  if (!provider || !editing) return <DetailSkeleton />;

  const finish = async () => {
    await end.mutateAsync().catch(() => {});
    await utils.admin.staff.current.invalidate();
    router.push(`/admin/providers/${slug}`);
  };
  return (
    <WorkspaceProvider value={value}>
      {/* the provider workspace's look for its editors (its form styles are scoped to .rt-pws) */}
      <div className="rt-pws rt-acc__stack">
        <div className="rt-pws-staff" role="region" aria-label="Editing as ReadTraining staff">
          <span><strong>{provider.name}</strong> · Editing as ReadTraining staff</span>
          <button type="button" className="rt-pws-staff__end" onClick={finish} disabled={end.isPending}>Finish</button>
        </div>
        {children}
      </div>
    </WorkspaceProvider>
  );
}
