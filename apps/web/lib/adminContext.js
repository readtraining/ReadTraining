"use client";

import { createContext, useContext } from "react";

// The signed-in admin ({ name, email, preset, permissions, twoStep }), given by the /admin panel layout after the server check.
const AdminContext = createContext(null);

export function AdminAccessProvider({ value, children }) {
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export const useAdminAccess = () => useContext(AdminContext);
