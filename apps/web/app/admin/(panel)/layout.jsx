import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/adminAccess";
import { AdminAccessProvider } from "@/lib/adminContext";
import { AUTH_ROUTES } from "@/lib/routes";
import NoAccess from "@/components/account/NoAccess";
import { SideMenuProvider } from "@/components/admin/workNav";
import { sideClosed, sideWidth } from "@/lib/sideMenu";

// Every admin panel page: only for an active admin who has finished sign-in (two-step where required). Checked by proxy.js on
// each request and again here if that check didn't pass through; anyone else goes to the admin login, which never says why.
export default async function AdminPanelLayout({ children }) {
  const admin = await getAdminAccess();
  if (!admin) redirect(AUTH_ROUTES.adminLogin);
  if (admin.unavailable) return <NoAccess type="admin" unavailable />;
  // the sidebar starts folded to its icon rail, or at the width it was dragged to, when this browser left it that way
  const cookieStore = await cookies();
  return (
    <AdminAccessProvider value={admin}>
      <SideMenuProvider closed={sideClosed(cookieStore)} width={sideWidth(cookieStore)}>{children}</SideMenuProvider>
    </AdminAccessProvider>
  );
}
