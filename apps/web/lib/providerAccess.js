"use client";

import { can } from "@readtraining/permissions";
import { useWorkspace } from "@/lib/workspaceContext";

// The provider workspace's buttons, shown only to the roles that may use them (the shared permission table). This only hides
// buttons: the API checks every action again.
export function useProviderAccess() {
  const w = useWorkspace();
  const actor = w ? { userId: w.userId || "", aal: "aal1", admin: null, memberships: [{ organisationId: w.id, type: "provider", role: w.role, status: "active", organisationStatus: w.status }] } : null;
  return {
    organisationId: w?.id || "",
    // the provider's own status: "active" once our team has approved it (pending, changes_requested, suspended, rejected)
    status: w?.status || "",
    can: (action, target = {}) => Boolean(actor && can(actor, action, { organisationId: w.id, ...target })),
  };
}
