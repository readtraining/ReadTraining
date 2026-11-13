// All the team / group training wording in ONE place. The booking card, the Team training card, the "Interested in staff training?"
// box, the mobile buy bar and the "Buying for your team?" trust item all read from here, so the text stays identical everywhere.
// Every team action links to the same quote page with the current course (see quoteHref in BookingProvider), and every one of
// them says the same thing: one name ("Team training") and one button ("Get a team quote").
// In-house training is arranged with a provider case by case, so nothing here promises a discount, a venue or tailored content.
export const TEAM = {
  note: "For groups of 6 or more at your workplace",
  short: "At your workplace, 6 or more", // the header menu's In-house line
  line: "Team training can be arranged with a provider at your workplace, on a date that suits your team. Ask us and we'll check availability and the price.",
  quoteText: "Price on request",
  cardTitle: "Team training",
  barTitle: "Team training",
  cta: "Get a team quote",
  bullets: [
    "Your team trains together at your workplace.",
    "On a date that suits you, if a provider can run it.",
    "For groups of 6 or more.",
    "Ask us and we'll check availability and the price.",
  ],
  trust: {
    title: "Buying for your team?",
    text: "Add places for your team, family or colleagues to one basket, or ask us for a team quote to train together at your workplace.",
  },
};
