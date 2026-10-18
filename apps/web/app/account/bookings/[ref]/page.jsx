import React from "react";
import AccountShell from "@/components/account/AccountShell";
import BookingDetail from "@/components/account/BookingDetail";
import { pageMetadata } from "@/lib/seo";

// Customer account: one booking (/account/bookings/<reference>). Private, so kept out of search.
export async function generateMetadata(props) {
  const { ref } = await props.params;
  return pageMetadata({ title: `Booking ${ref} | ReadTraining`, description: "Your booking.", path: `/account/bookings/${ref}`, noindex: true });
}

export default async function Page(props) {
  const { ref } = await props.params;
  return (
    <AccountShell demo current="bookings" title={`Booking ${ref}`}>
      <BookingDetail reference={ref} />
    </AccountShell>
  );
}
