// Becoming a provider: "Become a provider" (the For providers page) and Skill Saver's "Join" open provider onboarding. Signed
// out, the login page asks first (proxy.js), with "Sign up" for someone new, and comes back to it; a provider is always added to
// a normal ReadTraining login (the learner account), and someone who already has one goes to its workspace. Its fields are the
// brief's: company or instructor name, mobile number and the provider terms. Documents, VAT, logo and policies are added later
// in the workspace's settings.
import { AUTH_ROUTES } from "@/lib/routes";

export const PROVIDER_ONBOARDING_HREF = "/provider/onboarding";

export const providerSignup = {
  onboarding: {
    eyebrow: "Become a provider",
    title: "Provider details",
    lead: "Add a provider account to your login. You'll go straight to your provider workspace.",
    loading: "Loading…",
    formTitle: "Your provider details",
    formLead: "You use the same login for your learner and provider accounts, and can switch between them at any time.",
    // a provider's team invited this person and they haven't joined: offered before the form, which stays for their own provider
    invited: { text: (provider) => `${provider} has invited you to its team. Accept the invitation to work on its courses, rather than creating a provider of your own.`, action: "Accept your invitation", href: "/provider/join" },
    name: "Company or instructor name",
    nameHint: "The name learners see on your courses and your public profile.",
    mobile: "Mobile number",
    mobileHint: "We use it to contact you about your provider account.",
    terms: { before: "I agree to the", terms: "Provider terms", termsHref: AUTH_ROUTES.providerTerms, and: "and the", privacy: "Privacy policy", privacyHref: AUTH_ROUTES.privacy },
    submit: "Create provider account",
    sending: "Creating…",
  },
};
