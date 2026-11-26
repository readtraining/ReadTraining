"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorState } from "@/components/states/States";
import { useAdminAccess } from "@/lib/adminContext";
import { api } from "@/lib/trpc/react";
import { errorText } from "@/lib/useMe";
import { WorkspaceProvider } from "@/lib/workspaceContext";
import { DetailSkeleton } from "./adminParts";

// An admin editing a provider's work from the admin (its course, dates, price plans, profile, terms, venues), by their own
// switches: the provider's own editors, shown here inside the admin, never in the provider's workspace. Opening one starts a
// staff session for that provider, with no form (API admin.staff), and changes nothing: only once a change is saved does the bar
// say so, with Finish (the provider's owner is then emailed one summary of the changes; or after two hours unused, or when the
// admin opens another provider). `provider`: { id, name, slug, status }. Links inside the editors lead to the admin's pages.
// heading: the page's title (the provider's name on its Dates, Price plans and Profile pages), above the changes bar
export default function StaffEdit({ provider, heading = null, children }) {
  const me = useAdminAccess();
  const router = useRouter();
  const utils = api.useUtils();
  const current = api.admin.staff.current.useQuery(undefined, { retry: false });
  const start = api.admin.staff.start.useMutation();
  const end = api.admin.staff.end.useMutation();
  const editing = current.data?.organisationId === provider?.id;
  const changed = editing && current.data.changes > 0;
  // after any save in the editors, ask again whether the session has changed something (the bar appears with the first)
  const queryClient = useQueryClient();
  useEffect(
    () => queryClient.getMutationCache().subscribe((e) => {
      if (e.type === "updated" && e.action?.type === "success") utils.admin.staff.current.invalidate();
    }),
    [queryClient, utils],
  );
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
    staff: { content: Boolean(me?.permissions?.includes("approve")) },
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
  // a refusal (the provider isn't approved, say) says why, with nothing to try again; only a failed connection offers it
  if (start.isError) return (start.error?.data?.httpStatus ?? 500) < 500 ? <ErrorState title={errorText(start.error)} text={null} /> : <ErrorState onRetry={() => start.reset()} />;
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
        {heading}
        {changed && (
          <div className="rt-pws-staff" role="region" aria-label="Your changes as ReadTraining staff">
            <span><strong>{provider.name}</strong> · You changed this provider&apos;s work as ReadTraining staff. They&apos;ll be emailed a summary when you finish.</span>
            <button type="button" className="rt-pws-staff__end" onClick={finish} disabled={end.isPending}>Finish</button>
          </div>
        )}
        {children}
      </div>
    </WorkspaceProvider>
  );
}
