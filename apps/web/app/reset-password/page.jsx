import ResetPasswordForm from "@/components/others/ResetPasswordForm";
import { pageMetadata } from "@/lib/seo";

// Set a new password: opened from the reset email (see lib/auth/authClient.js and /auth/confirm). Private, so kept out of search.
export const metadata = pageMetadata({ title: "Set a new password | ReadTraining", description: "Choose a new password for your ReadTraining account.", path: "/reset-password", noindex: true });

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
