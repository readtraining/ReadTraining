// Comments and questions on a mock test ("Leave a comment", as on the reference, hurak.com). There is no comments endpoint in
// apps/api yet, so sending only simulates the call (as lib/quote.js and lib/reviews.js do). Replace the body with the real
// request when the endpoint exists; the form already handles a rejected promise with an error message.
export async function submitComment({ subject, test, name, email, text }) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: true, data: { subject, test, name, email, text } };
}
