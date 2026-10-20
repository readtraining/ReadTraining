"use client";

import React from "react";

// "Try again" on a page that couldn't check access: loads the same address again, which asks again.
export default function RetryButton({ label }) {
  return <button type="button" className="button -md -purple-1 text-white" onClick={() => window.location.reload()}>{label}</button>;
}
