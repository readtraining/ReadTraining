// Listed training providers (/providers and /providers/[slug]). Hurak's directory is a grid of approved providers, each opening
// a provider page with an about text, the provider's courses with "from" prices, and its terms and policies; the page copy and
// layout are ours. The providers below are placeholders: real ones come from the API later. `specialisms` are the catalogue
// subjects a provider teaches. The course catalogue takes its session provider names from this list (only providers that teach
// the course's subject), so a provider's page lists exactly the courses that run with it. The terms and
// policies are one shared default for now (the site's booking rules); a provider will be able to set its own.

export const providers = [
  { slug: "apex-training", name: "Apex Training", city: "London", specialisms: ["security", "first-aid"], about: "Apex Training is a London-based training provider running small-group courses with experienced trainers. Learners are supported from booking through to their certificate." },
  { slug: "northgate-learning", name: "Northgate Learning", city: "Leeds", specialisms: ["health-and-safety", "construction"], about: "Northgate Learning delivers practical courses for individuals and employers across Yorkshire and the North, from its Leeds training centre and online." },
  { slug: "brightpath-academy", name: "BrightPath Academy", city: "Birmingham", specialisms: ["business", "accounting-and-finance", "marketing"], about: "BrightPath Academy is a Birmingham training academy offering scheduled classroom and live online courses, with clear course information before you book." },
  { slug: "summit-skills", name: "Summit Skills", city: "Manchester", specialisms: ["personal-development", "teaching-and-academics", "business"], about: "Summit Skills runs vocational and compliance training from its Manchester centre and online, for individuals and for teams." },
  { slug: "harbour-training-group", name: "Harbour Training Group", city: "Bristol", specialisms: ["construction", "building-services", "health-and-safety"], about: "Harbour Training Group is a Bristol-based group of training centres delivering courses to individuals and employers across the South West." },
  { slug: "clearview-learning", name: "ClearView Learning", city: "Glasgow", specialisms: ["security", "health-and-care", "first-aid"], about: "ClearView Learning provides classroom and online training from Glasgow, with scheduled dates open to individuals and group bookings." },
  { slug: "northstar-training", name: "Northstar Training", city: "Liverpool", specialisms: ["security", "health-and-safety"], about: "Northstar Training runs scheduled classroom and live online courses, and can arrange private group sessions for employers." },
  { slug: "riverside-skills", name: "Riverside Skills", city: "Newcastle", specialisms: ["construction", "telecommunication", "building-services"], about: "Riverside Skills delivers workplace and licence-linked training in Newcastle and online, with regular dates throughout the year." },
  { slug: "kestrel-safety-training", name: "Kestrel Safety Training", city: "Nottingham", specialisms: ["health-and-safety", "first-aid", "construction"], about: "Kestrel Safety Training is a Nottingham provider focused on safety and compliance courses for individuals and workplaces." },
  { slug: "beacon-training-services", name: "Beacon Training Services", city: "London", specialisms: ["hospitality", "lifestyle", "marketing"], about: "Beacon Training Services offers classroom and online courses from London, with flexible dates for people fitting training around work." },
  { slug: "oakfield-learning", name: "Oakfield Learning", city: "Birmingham", specialisms: ["health-and-care", "personal-development", "teaching-and-academics"], about: "Oakfield Learning runs courses from its Birmingham centre and online, supporting learners with clear guidance before and after the course." },
  { slug: "pinnacle-compliance-training", name: "Pinnacle Compliance Training", city: "Manchester", specialisms: ["accounting-and-finance", "telecommunication", "hospitality"], about: "Pinnacle Compliance Training delivers compliance and workplace courses from Manchester and online, for individuals and employers." },
];

// {name} in a text is replaced with the provider's name.
export const providerPages = {
  directory: {
    title: "Listed training providers | ReadTraining",
    description: "Browse the approved training providers listed on ReadTraining, see the courses each one runs and book directly through ReadTraining.",
    hero: {
      eyebrow: "Listed training providers",
      title: ["Approved training providers listed with ReadTraining"],
      lead: "Whatever your learning goals, our training providers help you reach them, in a simple and seamless way. See our current partners below.",
      primary: { label: "Get started", href: "/for-providers" },
      secondary: { label: "Need support? Contact us", href: "/contact-us" },
    },
  },
  detail: {
    eyebrow: "Approved provider",
    badge: "Approved on ReadTraining",
    about: { eyebrow: "About us", title: "About {name}", detailsLabel: "Provider details" },
    courses: { eyebrow: "Our courses", title: "Courses you can book", text: "Courses run by {name}, each shown at its lowest available price." },
    policies: {
      eyebrow: "Terms and policies",
      title: "Terms and policies",
      text: "These apply to courses booked with {name} through ReadTraining.",
      items: [
        { q: "Booking and payment", a: "You pay at checkout, and your place is confirmed by email once the booking is complete. The price shown for a date is the price you pay." },
        { q: "Rescheduling and cancellation", a: "You can move your booking to another date free of charge up to 7 days before the course starts. Cancellations follow the provider's refund policy." },
        { q: "Results and certificates", a: "Your certificate is issued once you have completed the course and passed any assessment. Results from an awarding body can take up to 14 working days." },
        { q: "Conduct", a: "Learners are expected to follow the venue's rules and treat others with respect. A provider can ask someone to leave a course if their behaviour affects other learners." },
      ],
    },
  },
};
