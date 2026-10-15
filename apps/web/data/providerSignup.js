// Becoming a provider. As the client's site (hurak.com, checked 13 October 2026): "Become a provider" on the provider page opens a
// pop-up that creates a normal account (first name, last name, email, password; the same login as learners, with a "log in" link
// for people who already have one), then provider onboarding collects the details needed to create the provider workspace.
// The client's onboarding screens are behind sign-in, so the onboarding steps here are what our admin reviews before approving a
// provider (Admin > Providers > Applications: company, VAT, subjects, accreditation and insurance with their expiry dates).
// Draft until confirmed: the provider terms (no page yet; the general terms are linked) and the review time.
import { admin } from "@/data/admin";

const { feeDefaults } = admin;

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
    terms: { before: "By creating a provider account, you agree to our", terms: "Terms and conditions", and: "and", privacy: "Privacy policy" },
    login: { text: "Already have an account?", label: "Log in" },
    signedIn: { title: "You're signed in as {name}", text: "Use this account for your training business. You can add more people from your workspace later.", cta: "Continue to provider details" },
    checkEmail: { title: "Check your email", text: "We've sent a link to {email}. Open it to confirm your account, and you'll go straight on to your provider details." },
  },
  onboarding: {
    title: "Provider details",
    lead: "Tell us about your training business. We check every provider before their courses go live.",
    steps: ["Organisation", "Teaching", "Documents", "Review"], // the progress indicator (short, so four fit on one line)
    stepTitles: ["Your organisation", "What you teach", "Accreditation and insurance", "Review and submit"],
    next: "Continue",
    back: "Back",
    submit: "Submit application",
    sending: "Submitting…",
    org: {
      name: "Training company name",
      company: "Companies House number",
      companyHint: "8 characters, like 12345678 or SC123456.",
      vat: "VAT",
      vats: ["Registered", "Not registered"],
      city: "Town or city you're based in",
      website: "Website (optional)",
      phone: "Business phone number",
    },
    teach: {
      subjects: "Subjects you teach",
      subjectsHint: "Choose all that apply.",
      methods: "How you deliver training",
      courses: "How many courses do you run?",
      coursesOptions: ["1 to 5", "6 to 20", "21 to 50", "More than 50"],
    },
    docs: {
      intro: "Your courses can only go live while your accreditation and insurance are in date.",
      body: "Awarding body or accreditation",
      bodyHint: "For example Highfield, Qualsafe, CITB or BIIAB.",
      centre: "Centre or approval number",
      accExpiry: "Accreditation expiry date",
      cover: "Public liability insurance cover",
      covers: ["£1 million", "£2 million", "£5 million", "£10 million"],
      insExpiry: "Insurance expiry date",
      files: "Upload your certificates (optional)",
      filesHint: "PDF, JPG or PNG. You can also send them later from your workspace.",
    },
    review: {
      title: "Check your details",
      change: "Change",
      fee: `Our marketplace fee is ${feeDefaults.commission}% of each booking made through ReadTraining, plus a ${feeDefaults.card}% card fee. Listing your courses is free. You're paid on the ${feeDefaults.payoutDay}th of the following month.`,
      agree: "I confirm these details are correct and I agree to the provider terms.",
    },
    done: {
      title: "Application received",
      text: "Thanks. Your reference is {ref}. We review applications within 2 working days and will email {email} with the outcome.",
      next: ["We check your company, accreditation and insurance.", "If anything is missing, we'll tell you what to send.", "Once approved, your provider workspace opens and you can add your courses."],
      cta: { label: "Back to For providers", href: "/for-providers" },
    },
    pending: {
      title: "Your application is under review",
      text: "We received it on {date} (reference {ref}). We'll email you as soon as it's reviewed.",
    },
  },
  // the subjects and delivery methods, as the course catalogue's (data/courseCatalogue.js), so applications match the catalogue
  subjects: ["Accounting and Finance", "Building Services", "Business", "Construction", "First Aid", "Health and Care", "Health and Safety", "Hospitality", "Lifestyle", "Marketing", "Personal Development", "Security", "Teaching & Academics", "Telecommunication"],
  methods: [{ value: "classroom", label: "Classroom" }, { value: "live-online", label: "Live online" }, { value: "on-demand", label: "Online self-paced" }],
};
