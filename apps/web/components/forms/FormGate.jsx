import React from "react";
import { EmptyState } from "@/components/states/States";
import { CONTACT, FORMS, formReady } from "@/lib/forms";

// Every public form is shown through this: the form itself when its switch in lib/forms.js holds a real send, otherwise the
// site's "coming soon" panel (the shared EmptyState): call, WhatsApp or email, from the site's one contact setting; or nothing
// for a hidden form. Never write a
// "coming soon" for a form anywhere else. `inCard`: the panel sits inside a card or sheet that is already there. `headingLevel`:
// 1 where the panel is the whole page (the order confirmation), so the page still has its h1.
export default function FormGate({ form, inCard = false, headingLevel, children }) {
  if (formReady(form)) return children;
  const f = FORMS[form];
  if (!f || f.hidden) return null;
  // the email address appears once: where the text names it ("{email}"), or after the text
  const email = <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>;
  const [before, after] = f.text.split("{email}");
  return (
    <EmptyState
      icon="icon-wall-clock"
      title={f.title}
      text={after === undefined ? <>{f.text} Or email {email}.</> : <>{before}{email}{after}</>}
      inCard={inCard}
      headingLevel={headingLevel}
      action={{ label: `Call ${CONTACT.phone}`, href: CONTACT.phoneHref }}
      secondary={{ label: "WhatsApp us", href: CONTACT.whatsappHref }}
    />
  );
}
