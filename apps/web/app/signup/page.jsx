import SignUpFormv2 from "@/components/others/SignUpFormv2";
import React from "react";
export const metadata = {
  title: "Sign up | ReadTraining",
  description: "Create your ReadTraining account.",
};
export default function page() {
  return (
    <div className="main-content">
      <SignUpFormv2 />
    </div>
  );
}
