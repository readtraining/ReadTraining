"use client";

import { can } from "@readtraining/permissions";
import { useWorkspace } from "@/lib/workspaceContext";

// The provider workspace's buttons, shown only to the roles that may use them (the shared permission table), and to
// ReadTraining staff working here only what their switches allow (`staff`). This only hides buttons: the API checks every
// action again.
export function useProviderAccess() {
  const w = useWorkspace();
  const actor = w ? { userId: w.userId || "", aal: "aal1", admin: null, memberships: [{ organisationId: w.id, type: "provider", role: w.role, status: "active", organisationStatus: w.status, ...(w.staff ? { staff: { pricing: Boolean(w.staff.pricing), content: w.staff.content !== false } } : {}) }] } : null;
  return {
    organisationId: w?.id || "",
    userId: w?.userId || "",
    // the provider's own status: "active" once our team has approved it (pending, changes_requested, suspended, rejected)
    status: w?.status || "",
    // an admin working here as ReadTraining staff: { pricing }, or null
    staff: w?.staff || null,
    can: (action, target = {}) => Boolean(actor && can(actor, action, { organisationId: w.id, ...target })),
    // whether a page or menu item is theirs: the permission, or its "own only" form (a tutor sees their own dates and learners)
    // one action, or any of several (a page more than one role opens for different parts, such as Settings)
    sees: (action) => !action || [].concat(action).some((a) => Boolean(actor && (can(actor, a, { organisationId: w.id }) || can(actor, a, { organisationId: w.id, tutorUserId: w.userId })))),
  };
}
