// Frontend-only auth stubs. Replace the body of each function with the real
// backend call (tRPC / REST) later; the UI only depends on these signatures.
// Each function resolves on success and throws an Error with a user-facing
// message on failure.

export const AUTH_ROUTES = {
  afterLogin: "/",
  forgotPassword: "/forget-password",
  signUp: "/template/signup",
  login: "/template/login",
  terms: "/template/terms",
  // No privacy policy page exists yet; point this at the real route once added.
  privacy: "/privacy-policy",
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// TODO(auth): POST credentials to the API, store the session, return the user.
// Mock: email "error@example.com" fails so the error state can be previewed.
export async function loginWithPassword({ email, password }) {
  await wait(900);
  if (email.trim().toLowerCase() === "error@example.com") {
    throw new Error("Incorrect email or password. Please try again.");
  }
  return { email, password: undefined };
}

// TODO(auth): start the OAuth flow for the provider ("google" | "facebook").
export async function loginWithProvider(provider) {
  await wait(300);
  const name = provider === "facebook" ? "Facebook" : "Google";
  throw new Error(`${name} sign-in isn't available yet. Please log in with your email.`);
}

// TODO(auth): request a password-reset email (token generated server-side).
export async function requestPasswordReset({ email }) {
  await wait(900);
  return { email };
}

// TODO(auth): verify the reset token from the email link, then call this with
// the new password on a future /reset-password route.
export async function resetPassword({ token, password }) {
  await wait(900);
  return { token, password: undefined };
}

// TODO(auth): create the account (POST to the API) and trigger the email
// verification message. Mock: email "error@example.com" fails so the error
// state can be previewed.
export async function registerAccount({ firstName, lastName, email, password, marketingOptIn }) {
  await wait(1100);
  if (email.trim().toLowerCase() === "error@example.com") {
    throw new Error("An account with this email already exists. Try logging in instead.");
  }
  return { firstName, lastName, email, marketingOptIn, password: undefined };
}

// TODO(auth): start the OAuth sign-up flow for the provider ("google" | "facebook").
export async function signUpWithProvider(provider) {
  await wait(300);
  const name = provider === "facebook" ? "Facebook" : "Google";
  throw new Error(`${name} sign-up isn't available yet. Please sign up with your email.`);
}
