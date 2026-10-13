import { certificates } from "@/data/certificates";

// The certificate checker's rules and lookup. There is no certificate endpoint in apps/api yet, so `checkCertificate` reads the
// dummy records in data/certificates.js; replace its body with the real request (tRPC query or fetch) when the endpoint exists.
// The form already handles a rejected promise. A match needs the number and the holder's surname, so a number alone shows nothing.

// RT-2026-004815: "RT", the year of issue, six digits. Spaces are ignored, dashes are optional and letters may be lower case.
export const CERT_EXAMPLE = "RT-2026-004815";
export const normaliseCertNumber = (value) => {
  const m = value.replace(/\s+/g, "").toUpperCase().match(/^RT-?(\d{4})-?(\d{6})$/);
  return m ? `RT-${m[1]}-${m[2]}` : null;
};

// the surname is the end of the holder's name ("van Dyke" matches "Anna van Dyke"); case and extra spaces are ignored
const tidy = (v) => v.trim().replace(/\s+/g, " ").toLowerCase();
const hasSurname = (name, surname) => tidy(name).endsWith(` ${tidy(surname)}`);

// { status: "valid" | "expired", certificate } or { status: "not-found" }
export async function checkCertificate({ number, surname }) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const n = normaliseCertNumber(number);
  const certificate = certificates.find((c) => c.number === n && hasSurname(c.name, surname));
  if (!certificate) return { status: "not-found" };
  const today = new Date().toISOString().slice(0, 10);
  return { status: certificate.expires && certificate.expires < today ? "expired" : "valid", certificate };
}
