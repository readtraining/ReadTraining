import { topBar } from "@/data/home";

// The website's public forms, and whether each one really sends yet. This is the ONE switch for each form:
// - `send: null`: not ready. The form is never shown: <FormGate> shows the "coming soon" panel in its place (or nothing,
//   for `hidden` forms), with the real phone and email so a visitor always has a next step.
// - `send: <function>`: ready. <FormGate> shows the form. The function must call the server and return what the server
//   confirmed, e.g. { reference }. A form never makes up a reference and never shows success the server didn't confirm.
// So the day a form's endpoint exists, put its function here: the "coming soon" goes away everywhere that form is used.
// scripts/check-forms.mjs (run in CI with the typecheck) fails the build on a made-up reference, a simulated send, or a public
// form that doesn't go through <FormGate>.
export const FORMS = {
  checkout: { send: null, title: "Online booking is coming soon", text: "To book a place now, call or email us and we’ll arrange it for you." },
  contact: { send: null, title: "Our contact form is coming soon", text: "In the meantime, call or email us and we’ll get back to you." },
  quote: { send: null, title: "Online quotes are coming soon", text: "For a group or team quote now, call or email us with the course, the number of people and where." },
  jobs: { send: null, title: "Online applications are coming soon", text: "To register your interest now, email us your name, phone number and SIA licence details." },
  hseTest: { send: null, title: "Online test booking is coming soon", text: "To book your CITB HS&E test now, call or email us with your preferred centre and dates." },
  licence: { send: null, title: "Online applications are coming soon", text: "For help with your licence or card now, call or email us." },
  certificate: { send: null, title: "Certificate checks are coming soon", text: "To confirm a certificate now, email us the certificate number and the holder’s full name." },
  // hidden while not ready (a "coming soon" in these places would only get in the way)
  newsletter: { send: null, hidden: true },
  testReview: { send: null, hidden: true },
  testComment: { send: null, hidden: true },
};

export const formReady = (key) => typeof FORMS[key]?.send === "function";

// Sends a ready form. Only ever called from a form <FormGate> showed, so its `send` exists.
export const sendForm = (key, data) => FORMS[key].send(data);

// The real ways to reach us, for the "coming soon" panels
export const CONTACT = {
  phone: topBar.phone,
  phoneHref: `tel:${topBar.phone.replace(/\s+/g, "").replace(/^0/, "+44")}`,
  email: topBar.email,
};
