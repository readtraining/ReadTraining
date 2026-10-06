import LoginFormv2 from "@/components/others/LoginFormv2";
import React from "react";

// Temporary preview route for comparing Login Version 2 against /template/login.
// Delete this folder once a version is chosen.
export const metadata = {
  title: "Log in (v2) | ReadTraining",
  description: "Log in to your ReadTraining account.",
  robots: { index: false, follow: false },
};
export default function page() {
  return (
    <div className="main-content">
      <LoginFormv2 />
    </div>
  );
}
