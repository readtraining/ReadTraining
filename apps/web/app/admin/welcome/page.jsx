import AdminWelcome from "@/components/admin/AdminWelcome";
import { pageMetadata } from "@/lib/seo";

// Where an admin invite link lands: the invited person sets their name and password. Private, so kept out of search.
export const metadata = pageMetadata({ title: "Admin invite | ReadTraining", description: "Set up your ReadTraining admin account.", path: "/admin/welcome", noindex: true });

export default function Page() {
  return <AdminWelcome />;
}
