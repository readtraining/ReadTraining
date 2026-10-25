// The provider directory and provider pages' words (/providers and /providers/[slug]). The providers themselves are the
// approved organisations (API organisations.providerDirectory and providerProfile: lib/publicProvider.js).

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
