import { notFound } from "next/navigation";
import NoAccess from "@/components/account/NoAccess";
import { pageMetadata } from "@/lib/seo";

// Where proxy.js sends a /provider or /business request from someone without that identity (the address in the browser stays
// the one they asked for). ?unavailable=1 when access couldn't be checked. Private, so kept out of search.
export const metadata = pageMetadata({ title: "No access | ReadTraining", description: "This part of ReadTraining needs another account type.", path: "/no-access", noindex: true });

export default async function NoAccessPage({ params, searchParams }) {
  const { type } = await params;
  if (type !== "provider" && type !== "business") notFound();
  const { unavailable } = await searchParams;
  return <NoAccess type={type} unavailable={unavailable === "1"} />;
}
