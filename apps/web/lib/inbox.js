// What visitors send from the site's forms (quotes, "apply for me", training requests, contact messages, test bookings and
// Security Jobs applications), kept in this browser so the admin's Requests and Security Jobs pages show them next to the demo
// records. DEMO only: with a backend each form's submit helper (lib/quote.js, lib/contact.js, lib/licences.js,
// lib/securityJobs.js, the test booking) sends to the API instead and this file goes.
const KEY = "rt-inbox";

export function readInbox() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

// kind: quote | licence | training | contact | test | job. `reference` is the one the visitor was shown.
export function keepSubmission(kind, reference, data) {
  try {
    const list = readInbox();
    window.localStorage.setItem(KEY, JSON.stringify([{ kind, reference, at: Date.now(), data }, ...list].slice(0, 100)));
  } catch {}
}
