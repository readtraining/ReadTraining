// Becoming a provider, as the client's site (hurak.com) does it: "Become a provider" on the provider page opens a pop-up that
// creates a normal account (first name, last name, email, password, agreeing to the provider terms; the same login as learners,
// with a "log in" link for people who already have one); then provider onboarding asks for the provider details and opens the
// workspace. The client's onboarding screen is behind sign-in, so its fields are the brief's: company or instructor name,
// mobile number and the provider terms. Documents, VAT, logo and policies are added later in the workspace's settings.
import { AUTH_ROUTES } from "@/lib/routes";

export const PROVIDER_ONBOARDING_HREF = "/provider/onboarding";
export const BECOME_PROVIDER_HASH = "#become-provider";

export const providerSignup = {
  popup: {
    title: "Create your ReadTraining provider account",
    lead: "Set up access for your training business, then add the details we need to create your provider workspace.",
    forTitle: "What the provider account is for",
    for: [
      "Create and manage courses, cohorts and training dates.",
      "Keep learner records and delivery activity together.",
      "Build digital learning, including SCORM content.",
      "List eligible training on the ReadTraining marketplace.",
    ],
    submit: "Create provider account",
    sending: "Creating your account…",
    terms: { before: "By creating a provider account, you agree to our", terms: "Provider terms", and: "and", privacy: "Privacy policy" },
    login: { text: "Already have an account?", label: "Log in" },
    signedIn: { title: "You're signed in as {name}", text: "Use this account for your training business. You can add more people from your workspace later.", cta: "Continue to provider details" },
    checkEmail: { title: "Check your email", text: "We've sent a link to {email}. Open it to confirm your account, and you'll go straight on to your provider details." },
  },
  onboarding: {
    eyebrow: "Become a provider",
    title: "Provider details",
    lead: "Add a provider account to your login. You'll go straight to your provider workspace.",
    loading: "Loading…",
    formTitle: "Your provider details",
    formLead: "You use the same login for your learner and provider accounts, and can switch between them at any time.",
    name: "Company or instructor name",
    nameHint: "The name learners see on your courses and your public profile.",
    mobile: "Mobile number",
    mobileHint: "We use it to contact you about your provider account.",
    terms: { before: "I agree to the", terms: "Provider terms", termsHref: AUTH_ROUTES.providerTerms, and: "and the", privacy: "Privacy policy", privacyHref: AUTH_ROUTES.privacy },
    submit: "Create provider account",
    sending: "Creating…",
  },
};
