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
