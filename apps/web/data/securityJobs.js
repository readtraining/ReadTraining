// Security jobs (/security-jobs, the footer's For providers > Security Jobs): registering interest in full-time SIA security work
// with employers in our partner network. The client's current page (hurak.com/security-jobs) gave the functions only: who can
// apply, a quick eligibility check, what the roles offer, nationwide coverage, how it works, FAQs and the application. The page
// is our own, in the For Providers / Skill Saver page language: the opportunity first (hero with example matches, the facts
// strip, the roles), then what employers check, how it works, the consent promise, where the work can lead, and the application,
// which starts with the eligibility questions. Training for people not licensed yet comes after it.

import { TOPICS, courseSearch } from "@/data/courseTopics";

export const securityJobs = {
  title: "Security jobs | ReadTraining",
  description: "Register your interest in full-time SIA security jobs across the UK: permanent roles, 40+ hours a week, around £13 to £14 an hour. Not licensed yet? Train with an approved provider first.",

  hero: {
    eyebrow: "Security jobs",
    title: "Your SIA licence. Your next",
    highlight: "full-time role.", // in green with the underline, as the home hero
    text: "Register once and we match you with permanent security roles across the UK. Free to apply, and nothing reaches an employer until you say yes.",
    primary: { label: "Apply now", href: "#application" },
    secondary: { label: "Explore the roles", href: "#roles" },
    points: ["Free to apply", "About 3 minutes", "No CV needed"],
    floating: { title: "Free to apply", text: "No fees, ever" },
    // the hero's product frame: what a candidate's matches look like (an example, not live vacancies)
    matches: {
      frame: "Your matches",
      lead: "Roles matched to your licence and postcode",
      items: [
        { icon: "icon-basket", role: "Retail security officer", meta: "Bristol · Full time · Days", pay: "£13.50", chip: "New" },
        { icon: "icon-access", role: "Door supervisor", meta: "Manchester · Full time · Evenings", pay: "£14.00", chip: "New" },
        { icon: "icon-photo-camera", role: "CCTV operator", meta: "Leeds · Full time · Rota", pay: "£13.25" },
      ],
      per: "an hour",
      note: "Example matches. Real roles depend on employers' openings.",
    },
  },

  facts: [
    { icon: "icon-document", value: "Permanent", label: "Contracts, not zero hours" },
    { icon: "icon-wall-clock", value: "40+ hours", label: "A week, full time" },
    { icon: "icon-save-money", value: "£13 to £14", label: "An hour, typical pay" },
    { icon: "icon-worldwide", value: "Across the UK", label: "Partner employers nationwide" },
  ],

  roles: {
    eyebrow: "The roles",
    title: "Five kinds of security work",
    text: "Our partner employers hire for these roles. Each needs the matching SIA licence; pay depends on the site, the shifts and your experience.",
    items: [
      { key: "retail", icon: "icon-basket", title: "Retail security officer", licence: "Security Guard", work: "Keep shops, staff and customers safe and deter theft.", shifts: "Days and evenings, some weekends", where: "Shops, centres and supermarkets" },
      { key: "door", icon: "icon-access", title: "Door supervisor", licence: "Door Supervisor", work: "Manage entry, check ID and keep venues safe.", shifts: "Evenings, nights and weekends", where: "Bars, clubs, hotels and venues" },
      { key: "cctv", icon: "icon-photo-camera", title: "CCTV operator", licence: "CCTV Operator", work: "Watch live feeds, spot incidents and guide teams.", shifts: "Day and night shifts", where: "Council and site control rooms" },
      { key: "events", icon: "icon-friend", title: "Event security officer", licence: "Door Supervisor or Security Guard", work: "Run searches and entry, and manage crowds.", shifts: "Varied, often weekends", where: "Stadiums, concerts and festivals" },
      { key: "patrol", icon: "icon-location", title: "Mobile patrol officer", licence: "Security Guard + driving licence", work: "Drive between sites and respond to alarms.", shifts: "Mostly nights, on a rota", where: "Several sites across an area" },
    ],
    labels: { licence: "Licence", shifts: "Shifts", where: "Where" },
  },

  // who can apply, shown as what employers check (mid-page, not a barrier at the top)
  checks: {
    eyebrow: "Who can apply",
    title: "What employers check before you start",
    text: "Security roles come with standard pre-employment checks. Have these ready and your application moves faster.",
    points: [
      { title: "You are 18 or over, with a current SIA licence", text: "The licence must match the work, for example Security Guard for retail roles." },
      { title: "The right to work in the UK, full time", text: "Employers check this before your first shift." },
      { title: "A full five-year history", text: "Your addresses, and your work, education and any gaps, for BS 7858 screening." },
      { title: "Shifts the role needs", text: "Many sites run evenings, nights or weekends." },
    ],
    note: "Some sites ask for five years of continuous UK residency. We confirm this for each role.",
    cta: { label: "Check if you can apply", href: "#application" },
    frame: "Pre-employment checks",
    items: [
      { title: "SIA licence", text: "Checked on the SIA public register", status: "Complete" },
      { title: "Right to work", text: "Passport, share code or visa", status: "Complete" },
      { title: "BS 7858 screening", text: "Five-year address and work history", status: "In progress" },
      { title: "References", text: "Employers or education in the last five years", status: "Due" },
    ],
    frameNote: "Example of a candidate part way through checks.",
  },

  how: {
    eyebrow: "How it works",
    title: "From application to first shift",
    text: "Four steps, and you can stop at any point.",
    steps: [
      { icon: "icon-edit", title: "You apply", text: "Your licence, postcode, availability and the roles you want." },
      { icon: "icon-message", title: "A call with our team", text: "If you match a role, we call you for a short first chat." },
      { icon: "icon-person-2", title: "Meet the employer", text: "Only for roles you say yes to. They interview you." },
      { icon: "icon-badge", title: "Checks, then start", text: "Licence, right to work and screening, then your first shift." },
    ],
  },

  consent: {
    eyebrow: "Your details, your decision",
    title: "Nothing goes to an employer without your yes",
    text: "Registering puts you in our candidate pool, not on an employer's desk.",
    points: [
      { title: "We ask you first", text: "For every role, we tell you the employer, the site and the pay before anything is shared." },
      { title: "You choose what to share", text: "Say yes to a role and we send only what that employer needs." },
      { title: "Free, always", text: "Applying and being introduced cost you nothing." },
    ],
    cta: { label: "Apply now", href: "#application" },
    card: {
      label: "Introduction request",
      role: "Retail security officer",
      meta: "Bristol · Full time · around £13.50 an hour",
      rows: [
        { title: "Shared if you say yes", text: "Name, SIA licence, availability" },
        { title: "Never shared", text: "Anything else on your application" },
      ],
      yes: "Share my details",
      no: "Not now",
      note: "Example of what you see before any introduction.",
    },
  },

  // where the work can lead: typical progression in UK security, with the training that opens each next step
  grow: {
    eyebrow: "Where it can lead",
    title: "A first role, then a career",
    text: "Security has a clear ladder. Experience and an extra licence or qualification open the next step.",
    steps: [
      { level: "Start", title: "Security officer", text: "Retail, door, events or patrol work on a full-time contract." },
      { level: "Next", title: "Senior officer", text: "Lead a shift, train new starters and handle escalations." },
      { level: "Then", title: "Supervisor", text: "Run a site's team, rotas and reporting." },
      { level: "Later", title: "Site or contract manager", text: "Own the client relationship and several sites." },
    ],
    addTitle: "Add a licence, widen your options",
    adds: [
      { label: "CCTV Operator", href: courseSearch("CCTV Operator") },
      { label: "Door Supervisor", href: courseSearch("Door Supervisor") },
      { label: "Close Protection", href: courseSearch("Close Protection") },
    ],
  },

  application: {
    eyebrow: "Apply",
    title: "Your application",
    text: "About 3 minutes. We ask three quick questions first, so you only fill in the form if you can apply.",
    steps: ["Eligibility", "About you", "Licence", "Work"], // the stepper
    titles: ["Can you apply?", "About you", "Your SIA licence", "The work you want"], // each step's heading
    progressLabel: "Application progress",
    // step 1: the eligibility questions
    check: {
      lead: "Three questions. Your answers decide whether you can apply.",
      questions: [
        { key: "licence", q: "Do you have a current SIA licence?", options: [["yes", "Yes"], ["no", "No"]] },
        { key: "work", q: "Do you have the right to work full time in the UK?", options: [["yes", "Yes"], ["no", "No"]] },
        { key: "history", q: "Can you give a full five-year address and work history?", options: [["yes", "Yes"], ["partly", "Not fully"]] },
      ],
      results: {
        ready: { title: "You can apply", text: "You meet the basic requirements." },
        partly: { title: "You can still apply", text: "Tell us about any gaps in the last step and we will check which roles suit you." },
        noLicence: { title: "You need an SIA licence first", text: "Every role needs a current SIA licence. Train with an approved provider, then come back and apply.", cta: { label: "See SIA courses", href: "#training" } },
        noWork: { title: "You cannot apply yet", text: "Employers need the right to work full time in the UK.", cta: { label: "Read the FAQs", href: "#faqs" } },
      },
      pending: "Answer all three to continue.",
    },
    form: {
      licenceTypes: ["Security Guard", "Door Supervisor", "CCTV Operator", "Close Protection"],
      roles: ["Retail security", "Door supervision", "CCTV", "Events", "Mobile patrol", "Relief cover"],
      shifts: ["Days", "Evenings", "Nights", "Weekends"],
      start: ["Straight away", "Within 2 weeks", "Within a month", "In more than a month"],
      travel: ["Up to 5 miles", "Up to 10 miles", "Up to 20 miles", "Anywhere in the UK"],
      gapsHint: "You said your five-year history is not complete. Tell us briefly about any gaps.",
      consent: "Share my details with an employer only when I agree to a specific role.",
      privacy: { text: "We use your details to match you with roles. See our", link: { label: "Privacy Policy", href: "/privacy-policy" } },
      next: "Continue",
      back: "Back",
      submit: "Send application",
      sending: "Sending",
    },
    aside: {
      title: "What happens next",
      steps: ["We review your application", "If you match a role, we call you", "You say yes before any introduction"],
      points: ["Free to apply", "No CV needed", "Your details stay with us"],
      help: { text: "Questions?", label: "Read the FAQs", href: "#faqs" },
    },
    done: { title: "Application received", text: "Your reference is {ref}. If a role matches your licence, location and availability, our team will call you and email {email}. Applying does not guarantee a job.", again: "Back to the top" },
  },

  training: {
    eyebrow: "Not licensed yet?",
    title: "Train, get your licence, then apply",
    text: "Every role needs an SIA licence. Book the course with an approved provider here, apply for your licence, then come back and apply for work.",
    steps: [
      { title: "Book your SIA course", text: "Classroom training with an approved provider, from a few days." },
      { title: "Apply for your licence", text: "Pass your exams, then apply to the SIA for your licence." },
      { title: "Apply for a role", text: "Send your application here once your licence arrives." },
    ],
    picks: [TOPICS.doorSupervisor, TOPICS.securityOfficer, TOPICS.cctv, TOPICS.closeProtection],
    all: { label: "All security courses", href: "/courses/security" },
  },

  faq: {
    eyebrow: "FAQs",
    title: "Questions about security jobs",
    items: [
      { q: "Do I need an SIA licence?", a: "Yes. Every role needs a current SIA licence that matches the work, for example Security Guard or Door Supervisor. If you do not have one yet, book an SIA course first." },
      { q: "Are there roles near me?", a: "Our partner employers hire across the UK, but openings depend on their contracts in each area. We match your postcode and how far you can travel to the roles available, and contact you when one fits." },
      { q: "Do I need five years in the UK?", a: "Not for every role. Some sites ask for five years of continuous UK residency for security screening. We check this for each role before putting you forward." },
      { q: "Can I apply while I am studying?", a: "Yes, if you can work the full-time hours a role needs. Tell us your availability in the application." },
      { q: "Does applying guarantee me a job?", a: "No. We match applications to the roles available, and the employer makes the final interview and hiring decision." },
      { q: "What happens to my details?", a: "We use them only to match you with roles. They go to an employer only when you agree to be put forward for a specific role." },
      { q: "Does it cost anything?", a: "No. Applying and being introduced to an employer are free." },
    ],
  },

  cta: {
    title: "Ready for your next security role?",
    text: "Licensed? Apply in about 3 minutes. Not yet? Start with an SIA course.",
    primary: { label: "Apply now", href: "#application" },
    secondary: { label: "Find an SIA course", href: "/courses/security" },
  },
};
