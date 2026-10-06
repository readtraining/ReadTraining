import SignUpFormv2 from "@/components/others/SignUpFormv2";
import React from "react";

// Temporary preview route for comparing Sign Up Version 2 against /template/signup.
// Delete this folder once a version is chosen.
export const metadata = {
  title: "Sign up (v2) | ReadTraining",
  description: "Create your ReadTraining account.",
  robots: { index: false, follow: false },
};
export default function page() {
  return (
    <div className="main-content">
      <SignUpFormv2 />
    </div>
  );
}
