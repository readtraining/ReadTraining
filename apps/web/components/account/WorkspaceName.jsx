"use client";

import { useWorkspace } from "@/lib/workspaceContext";

// The name of the provider or business the page belongs to (from the server check), for page headings.
export default function WorkspaceName() {
  return useWorkspace()?.name ?? "";
}
