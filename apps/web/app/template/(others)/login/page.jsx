import LoginForm from "@/components/others/LoginForm";
import React from "react";
export const metadata = {
  title: "Log in | ReadTraining",
  description: "Log in to your ReadTraining account.",
};
export default function page() {
  return (
    <div className="main-content">
      <LoginForm />
    </div>
  );
}
