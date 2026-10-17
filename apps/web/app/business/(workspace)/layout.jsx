import NoAccess from "@/components/account/NoAccess";
import { getWorkspace } from "@/lib/workspace";
import { WorkspaceProvider } from "@/lib/workspaceContext";

// Every Business account page: only for a member of a business (checked by proxy.js on each request, and again here if the
// check didn't pass through). The pages get the business (name, role) from useWorkspace().
export default async function BusinessWorkspaceLayout({ children }) {
  const { workspace, unavailable } = await getWorkspace("business");
  if (!workspace) return <NoAccess type="business" unavailable={unavailable} />;
  return <WorkspaceProvider value={workspace}>{children}</WorkspaceProvider>;
}
