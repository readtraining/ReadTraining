// Sends a contact-form message. There is no contact endpoint in apps/api yet, so this only simulates the call and makes up a
// reference. Replace the body with the real request (tRPC mutation or fetch) when the endpoint exists; the form already
// handles a rejected promise by showing an error message.
export async function submitContact(data) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: true, reference: `RT-${String(Date.now()).slice(-6)}`, data };
}
