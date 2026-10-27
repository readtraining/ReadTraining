"use client";

import React from "react";
import Link from "next/link";
import { api } from "@/lib/trpc/react";
import { useProviderAccess } from "@/lib/providerAccess";
import { ErrorState } from "@/components/states/States";
import { Loading } from "./providerParts";
import { useProviderCourses } from "./ProviderCourses";

// Public profile (Hurak's, from the account menu): the provider as learners see it: logo, name, headline, about, social links,
// and the policies (booking terms, cancellation policy). "Edit profile" opens the provider settings. From the API.
export default function ProviderProfile() {
  const { organisationId, can } = useProviderAccess();
  const query = api.provider.profile.get.useQuery({ organisationId }, { enabled: Boolean(organisationId) });
  const courses = useProviderCourses().data;
  if (query.isError) return <ErrorState title="We couldn't load your profile." text="Check your connection, then try again." onRetry={() => query.refetch()} />;
  const o = query.data;
  if (!o) return <Loading rows={3} />;
  const initials = o.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const social = [["Facebook", o.socials.facebook], ["LinkedIn", o.socials.linkedin], ["YouTube", o.socials.youtube]].filter(([, url]) => url);
  const live = courses ? courses.filter((c) => c.status === "live" && c.isPublic && c.listed).length : null;

  return (
    <div className="rt-acc__stack">
      <section className="rt-acc__card rt-pws-prof" aria-labelledby="rt-pws-prof-h">
        <span className="rt-pws-prof__logo">
          {o.logoUrl ? <img src={o.logoUrl} alt="" width={96} height={96} /> : <span aria-hidden="true">{initials}</span>}
        </span>
        <div className="rt-pws-prof__text">
          <h2 className="rt-acc__h2" id="rt-pws-prof-h">{o.name}</h2>
          {o.headline && <p className="rt-pws-prof__headline">{o.headline}</p>}
          <p className="rt-acc__note">{[o.city, live === null ? "" : `${live} ${live === 1 ? "course" : "courses"} on ReadTraining`].filter(Boolean).join(" · ")}</p>
          {social.length > 0 && (
            <ul className="rt-pws-prof__social">
              {social.map(([label, url]) => <li key={label}><a href={url} target="_blank" rel="noopener noreferrer" className="rt-cd__link">{label}</a></li>)}
            </ul>
          )}
        </div>
        {can("provider.profile.edit") && <Link href="/provider/settings" className="button -sm -outline-purple-1 text-purple-1">Edit profile</Link>}
      </section>
      <section className="rt-acc__card" aria-labelledby="rt-pws-prof-about">
        <h2 className="rt-acc__h2" id="rt-pws-prof-about">About</h2>
        <p className="rt-pws-prof__body">{o.bio || "No biography yet."}</p>
      </section>
      <section className="rt-acc__card" aria-labelledby="rt-pws-prof-pol">
        <h2 className="rt-acc__h2" id="rt-pws-prof-pol">Policies</h2>
        <h3 className="rt-adm-h3">Booking terms</h3>
        <p className="rt-pws-prof__body">{o.bookingTerms || "Not added yet."}</p>
        <h3 className="rt-adm-h3">Cancellation policy</h3>
        <p className="rt-pws-prof__body">{o.cancellationPolicy || "Not added yet."}</p>
      </section>
    </div>
  );
}
