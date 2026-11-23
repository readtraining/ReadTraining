// The provider directory and provider pages' words (/providers and /providers/[slug]). The providers themselves are the
// approved organisations (API organisations.providerDirectory and providerProfile: lib/publicProvider.js).

// {name} in a text is replaced with the provider's name.
export const providerPages = {
  directory: {
    title: "Listed training providers | ReadTraining",
    description: "Browse the approved training providers listed on ReadTraining, see the courses each one runs and compare their dates and prices.",
    hero: {
      eyebrow: "Listed training providers",
      title: ["Approved training providers listed with ReadTraining"],
      lead: "Every provider here is an independent training company approved by our team. See who they are and compare the courses each one runs.",
      primary: { label: "Get started", href: "/for-providers" },
      secondary: { label: "Need support? Contact us", href: "/contact-us" },
    },
  },
  // a provider that has just joined (created in the database): its profile exists straight away, with what isn't there yet
  // said plainly; it stays out of search engines until the provider is approved
  newProvider: {
    eyebrow: "Training provider",
    lead: "Training courses from {name} on ReadTraining.",
    primary: { label: "Browse all courses", href: "/courses" },
    about: { title: "About {name}", text: "{name} hasn't added their details yet." },
    courses: { title: "No courses yet", text: "{name} hasn't published any courses yet. Browse other courses in the meantime.", action: { label: "Browse courses", href: "/courses" } },
  },
  detail: {
    eyebrow: "Approved provider",
    badge: "Approved on ReadTraining",
    about: { eyebrow: "About us", title: "About {name}", detailsLabel: "Provider details", followLabel: "Follow" },
    courses: { eyebrow: "Our courses", title: "Courses you can book", text: "Courses run by {name}, each shown at its lowest available price." },
    // the provider's own FAQs (Settings › FAQs), as it typed them; left out when it has none
    faqs: {
      eyebrow: "FAQs",
      title: "Questions about {name}",
      text: "Answers from {name} about booking and training with them.",
    },
    policies: {
      eyebrow: "Before you book",
      title: "Terms and policies",
      text: "These apply to courses booked with {name} through ReadTraining.",
      // the two groups: the provider's own terms, as it wrote them, then ReadTraining's policies for every booking
      own: "Terms from {name}",
      shared: "ReadTraining policies",
      items: [
        { q: "Booking and payment", a: "Online booking is coming soon. Until then, call or email us and we'll book your place for you. The price shown for a date is the price you pay." },
        { q: "Rescheduling and cancellation", a: "Date changes and cancellations follow the provider's own cancellation and refund policy, shown above when they have added one. If it isn't shown, ask us before you book and we'll tell you what it is." },
        { q: "Results and certificates", a: "Your certificate is issued once you have completed the course and passed any assessment. Results from an awarding body can take up to 14 working days." },
        { q: "Conduct", a: "Learners are expected to follow the venue's rules and treat others with respect. A provider can ask someone to leave a course if their behaviour affects other learners." },
      ],
    },
  },
};
