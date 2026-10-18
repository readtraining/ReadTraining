import React from "react";
import AccountShell from "@/components/account/AccountShell";
import CancelRequest from "@/components/account/CancelRequest";
import { account } from "@/data/account";
import { pageMetadata } from "@/lib/seo";

// Customer account: the cancellation and refund request for one booking. Private, so kept out of search.
export async function generateMetadata(props) {
  const { ref } = await props.params;
  return pageMetadata({ title: `Cancel booking ${ref} | ReadTraining`, description: "Request a cancellation.", path: `/account/bookings/${ref}/cancel`, noindex: true });
}

export default async function Page(props) {
  const { ref } = await props.params;
  return (
    <AccountShell demo current="bookings" title={account.cancel.title} lead={account.cancel.lead}>
      <CancelRequest reference={ref} />
    </AccountShell>
  );
}
