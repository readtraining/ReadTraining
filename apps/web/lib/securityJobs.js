// Sends a security jobs application. There is no applications endpoint in apps/api yet, so this only simulates the call and
// makes up a reference (as lib/contact.js does for messages). Replace the body with the real request when the endpoint exists;
// the form already handles a rejected promise by showing an error message.
export async function submitApplication() {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return { reference: `SJ-${String(Math.floor(100000 + Math.random() * 900000))}` };
}

// An SIA licence number: 16 digits (spaces are ignored).
export const validLicenceNumber = (value) => /^\d{16}$/.test(value.replace(/\s+/g, ""));
