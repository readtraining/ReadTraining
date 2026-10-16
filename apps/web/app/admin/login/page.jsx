import AdminLogin from "@/components/admin/AdminLogin";
import { pageMetadata } from "@/lib/seo";

// The admin sign-in: its own address and look, no sign-up. Private, so kept out of search.
export const metadata = pageMetadata({ title: "Admin sign-in | ReadTraining", description: "Sign in to the ReadTraining admin panel.", path: "/admin/login", noindex: true });

export default function Page() {
  return <AdminLogin />;
}
