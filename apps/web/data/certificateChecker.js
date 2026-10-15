import { CATALOGUE_HREF } from "@/lib/routes";
import { CERT_EXAMPLE } from "@/lib/certificates";

// Verify a certificate (/certificate-checker). The checker follows the client's current page (hurak.com/certificate-checker:
// the certificate number and the holder's name, exactly as on the certificate); the result states, the "not found" reasons
// and the links to the official registers follow the awarding bodies' own checkers (IOSH, NEBOSH, Highfield, the SIA register).

export const certificateChecker = {
  title: "Verify a certificate | ReadTraining",
  description: "Check that a certificate from a course booked through ReadTraining is genuine and in date. Free, and it takes a few seconds.",
  hero: {
    eyebrow: "Verify a certificate",
    title: ["Check a certificate is genuine"],
    lead: "Employers, agencies and venues can confirm a certificate from a course booked through ReadTraining. It is free and takes a few seconds.",
  },
  // beside the form: what the check shows
  intro: {
    eyebrow: "Certificate checker",
    title: "Enter the certificate details",
    text: "You need the certificate number and the holder's surname, exactly as they appear on the certificate.",
    points: [
      { icon: "icon-badge", title: "Whether it is genuine", text: "We confirm the certificate matches our records." },
      { icon: "icon-calendar", title: "Whether it is in date", text: "When it was issued, and when it expires if it does." },
      { icon: "icon-graduate-cap", title: "What it covers", text: "The course, the qualification, the awarding body and the training provider." },
    ],
    privacy: "To protect the holder's privacy, we only show a result when the number and the surname both match.",
  },
  form: {
    title: "Check a certificate",
    number: { label: "Certificate number", hint: `For example, ${CERT_EXAMPLE}` },
    surname: { label: "Holder's surname", hint: "As it appears on the certificate." },
    where: {
      summary: "Where do I find the certificate number?",
      text: "It is printed at the bottom left of the certificate, under the holder's name. It starts with RT, followed by the year it was issued.",
    },
    errors: {
      numberEmpty: "Enter the certificate number.",
      numberFormat: `Enter the certificate number in the correct format, like ${CERT_EXAMPLE}.`,
      surnameEmpty: "Enter the holder's surname.",
      failed: "We could not check the certificate. Please try again.",
    },
    submit: "Check certificate",
    checking: "Checking",
  },
  result: {
    valid: {
      status: "Verified",
      title: "This certificate is genuine",
      text: "It matches our records and is in date.",
      noExpiry: "It matches our records. This qualification has no expiry date.",
    },
    expired: {
      status: "Expired",
      title: "This certificate has expired",
      text: "It matches our records, but it expired on {date}. The holder needs to retake or refresh the training.",
      link: { label: "Find refresher courses", href: CATALOGUE_HREF },
    },
    notFound: {
      status: "Not found",
      title: "We could not find a matching certificate",
      text: "This does not always mean the certificate is not genuine. It may be that:",
      reasons: [
        "the number or surname was entered differently from the certificate",
        "the certificate was issued in the last 5 working days",
        "the holder's name has changed since the course",
        "the course was not booked through ReadTraining",
      ],
      help: { text: "If you still cannot verify it,", link: { label: "contact us with a copy of the certificate", href: "/contact-us?topic=other#contact-form" } },
      retry: "Check the details and try again",
    },
    fields: {
      name: "Name",
      course: "Course",
      qualification: "Qualification",
      awardingBody: "Awarding body",
      provider: "Training provider",
      number: "Certificate number",
      issued: "Date issued",
      expires: "Valid until",
      noExpiry: "No expiry date",
    },
    checked: "Checked on",
    again: "Check another certificate",
  },
  // licences, cards and regulated qualifications: the issuing body's own checker
  official: {
    eyebrow: "Licences and qualifications",
    title: "Check with the official register too",
    text: "Licences, cards and regulated qualifications are also recorded by the body that issues them. For a licence or a card, rely on its official register.",
    items: [
      { icon: "icon-person-3", title: "SIA licence", text: "Check that security staff hold a valid licence on the SIA's register of licence holders.", link: { label: "Check an SIA licence", href: "https://www.gov.uk/check-a-private-security-licence" } },
      { icon: "icon-architecture", title: "CSCS card", text: "Check a construction worker's card with CSCS Smart Check, online or in the app.", link: { label: "Check a CSCS card", href: "https://www.cscs.uk.com/blog/check-cscs-card-smart-check/" } },
      { icon: "icon-document", title: "NEBOSH qualification", text: "Verify a NEBOSH certificate through NEBOSH's free online verification service.", link: { label: "Verify a NEBOSH certificate", href: "https://www.nebosh.org.uk/online-verifications" } },
      { icon: "icon-graduation-1", title: "Highfield qualification", text: "Check a certificate from Highfield Qualifications with its Checkcert service.", link: { label: "Use Highfield Checkcert", href: "https://www.highfieldqualifications.com/checkcert" } },
    ],
  },
  faq: {
    eyebrow: "FAQs",
    title: "Questions about verifying a certificate",
    items: [
      { q: "Who can use the certificate checker?", a: "Anyone with the certificate in front of them: employers, recruitment agencies, venues and the holder. It is free and you do not need an account." },
      { q: "Which certificates can I check here?", a: "Certificates for courses booked through ReadTraining. For a certificate from another company, contact the training provider or awarding body named on it." },
      { q: "Why do you ask for the surname?", a: "So that only someone who has the certificate can see its details. A certificate number on its own shows nothing." },
      { q: "The certificate is new and the checker cannot find it. Why?", a: "New certificates can take up to 5 working days to appear in our records. Try again later, or contact us with a copy of the certificate." },
      { q: "What does an expired certificate mean?", a: "The holder completed the training, but the certificate is past its expiry date. Many roles need refresher training, for example first aid at work every three years." },
      { q: "My certificate is lost or has a mistake on it. What should I do?", a: "Send us a message with your booking reference and we will help you get a replacement or a correction from your training provider." },
    ],
  },
};
