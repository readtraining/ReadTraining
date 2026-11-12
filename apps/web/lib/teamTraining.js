// All the team / group training wording in ONE place. The booking card, the Team training card, the "Interested in staff training?"
// box, the mobile buy bar and the "Buying for your team?" trust item all read from here, so the text stays identical everywhere.
// Every team action links to the same quote page with the current course (see quoteHref in BookingProvider).
// In-house training is arranged with a provider case by case, so nothing here promises a discount, a venue or tailored content.
export const TEAM = {
  note: "For groups of 6 or more at your workplace",
  short: "At your workplace, 6 or more", // the header menu's In-house line
  line: "In-house training can be arranged with a provider at your workplace, on a date that suits your team. Ask us and we'll check availability and the price.",
  quoteText: "Contact us for a quote",
  cardTitle: "Team training",
  barTitle: "In-house training",
  cta: "Get a quote",
  bullets: [
    "Your team trains together at your workplace.",
    "On a date that suits you, if a provider can run it.",
    "For groups of 6 or more.",
    "Ask us and we'll check availability and the price.",
  ],
  staff: {
    title: "Interested in staff training?",
    text: "Ask us about training a group of staff at your workplace. We'll check availability and the price with a provider.",
    link: "Get a group quote",
  },
  trust: {
    title: "Buying for your team?",
    text: "Book courses for your team, family or colleagues. Online booking is coming soon: until then, call us and we'll book everyone's places.",
  },
};
