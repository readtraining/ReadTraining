import NoAccess from "@/components/account/NoAccess";
import { getWorkspace } from "@/lib/workspace";
import { WorkspaceProvider } from "@/lib/workspaceContext";

// Every provider workspace page: only for a member of a provider (checked by proxy.js on each request, and again here if the
// check didn't pass through). The pages get the provider (name, role, status) from useWorkspace().
export default async function ProviderWorkspaceLayout({ children }) {
  const { workspace, unavailable } = await getWorkspace("provider");
  if (!workspace) return <NoAccess type="provider" unavailable={unavailable} />;
  return <WorkspaceProvider value={workspace}>{children}</WorkspaceProvider>;
}
