"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

// The workspace the page is in ({ id, name, slug, status, statusNote, type, role, userId }), given by the /provider and /business layouts after
// the server check. Browser components read it for the organisation's name and the person's role. `rename(name)` shows a name
// just saved straight away (the sidebar, the account menu), until the server's copy (router.refresh()) catches up.
const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ value, children }) {
  const [renamed, setRenamed] = useState(null);
  // the server's copy changed (it caught up, or another workspace opened): it wins again
  useEffect(() => setRenamed(null), [value?.id, value?.name]);
  const shown = useMemo(() => (value ? { ...value, name: renamed ?? value.name, rename: setRenamed } : value), [value, renamed]);
  return <WorkspaceContext.Provider value={shown}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = () => useContext(WorkspaceContext);

// Where the provider's own screens link to. In the workspace these are its pages; an admin editing the provider from the admin
// (components/admin/StaffEdit.jsx) gives the admin's pages instead (`links` on the context value), so a reused editor never
// leads into the provider's workspace. `cohort` may be null: no page for one date (the row's own menu edits it).
const WORKSPACE_LINKS = {
  courses: () => "/provider/courses",
  course: (id, tab) => `/provider/courses/${id}${tab ? `?tab=${tab}` : ""}`,
  preview: (id) => `/provider/courses/${id}/preview`,
  plans: () => "/provider/packages",
  dates: (courseId) => `/provider/cohorts${courseId ? `?course=${courseId}` : ""}`,
  cohort: (id) => `/provider/cohorts/${id}`,
};
export const useWorkspaceLinks = () => ({ ...WORKSPACE_LINKS, ...(useContext(WorkspaceContext)?.links ?? {}) });
