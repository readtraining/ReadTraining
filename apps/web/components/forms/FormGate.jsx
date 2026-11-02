import React from "react";
import { EmptyState } from "@/components/states/States";
import { CONTACT, FORMS, formReady } from "@/lib/forms";

// Every public form is shown through this: the form itself when its switch in lib/forms.js holds a real send, otherwise the
// site's "coming soon" panel (the shared EmptyState): call, WhatsApp or email, from the site's one contact setting; or nothing
// for a hidden form. Never write a
// "coming soon" for a form anywhere else. `inCard`: the panel sits inside a card or sheet that is already there.
export default function FormGate({ form, inCard = false, children }) {
  if (formReady(form)) return children;
  const f = FORMS[form];
  if (!f || f.hidden) return null;
  return (
    <EmptyState
      icon="icon-wall-clock"
      title={f.title}
      text={<>{f.text} Or email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.</>}
      inCard={inCard}
      action={{ label: `Call ${CONTACT.phone}`, href: CONTACT.phoneHref }}
      secondary={{ label: "WhatsApp us", href: CONTACT.whatsappHref }}
    />
  );
}
