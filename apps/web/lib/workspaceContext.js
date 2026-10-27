"use client";

import { createContext, useContext } from "react";

// The workspace the page is in ({ id, name, slug, status, statusNote, type, role, userId }), given by the /provider and /business layouts after
// the server check. Browser components read it for the organisation's name and the person's role.
const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ value, children }) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = () => useContext(WorkspaceContext);
