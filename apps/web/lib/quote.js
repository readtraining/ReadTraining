// Sends a group-quote request. There is no quote endpoint in apps/api yet, so this only simulates the call.
// Replace the body with the real request (tRPC mutation or fetch) when the endpoint exists; the form already handles
// a rejected promise by showing an error message.
export async function submitQuote(data) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: true, data };
}
