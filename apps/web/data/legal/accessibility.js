// Accessibility Statement (DRAFT). Read through lib/legal.js; same shape as terms.js. The client's current site has no
// accessibility statement, so this is ours, following the structure of the UK model statement (GOV.UK) and aiming at WCAG 2.2
// level AA. It only claims what the site does today (skip link, visible focus, keyboard use, reduced motion, tables that
// reflow); the audit results are to be added. Values in [brackets] are to be confirmed.

export const accessibility = {
  slug: "accessibility",
  href: "/accessibility-statement",
  title: "Accessibility Statement",
  description: "How accessible the ReadTraining website is, the standard we work to, known issues, and how to get help or report a problem.",
  lead: "We want everyone to be able to find, compare and book training on ReadTraining. This statement explains how accessible the website is and how to get help.",
  version: "",
  published: "2026-10-09",
  updated: "2026-10-09",
  effective: "2026-10-09",
  draft: true,
  contact: {
    title: "Need help or a different format?",
    text: "Tell us about a problem, or ask for information in another format.",
    subject: "Accessibility",
  },
  sections: [
    {
      id: "our-commitment",
      title: "Our commitment",
      blocks: [
        "This statement applies to the ReadTraining website. We want it to be usable by as many people as possible, including people who use a keyboard, a screen reader, voice control or screen magnification.",
        "We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA, and we design new pages with accessibility in mind from the start.",
      ],
    },
    {
      id: "using-the-website",
      title: "Using this website",
      blocks: [
        "You should be able to:",
        {
          type: "ul",
          items: [
            "zoom in up to 400% without the text spilling off the screen;",
            "move through the website using just a keyboard, with a visible focus outline and a \"Skip to main content\" link;",
            "use the website with a screen reader, with headings, landmarks and labelled form fields;",
            "reduce motion, as the website follows the \"reduce motion\" setting on your device;",
            "read tables on a phone, where they are shown as simple lists;",
            "answer mock test questions with the keyboard as well as the mouse.",
          ],
        },
        "[AbilityNet](https://mcmw.abilitynet.org.uk/) has advice on making your device easier to use if you have a disability.",
      ],
    },
    {
      id: "known-issues",
      title: "Known issues",
      blocks: [
        "We know some parts of the website are not yet fully accessible:",
        {
          type: "ul",
          items: [
            "some older pages and content may not yet meet our standard;",
            "some documents from training providers, such as PDFs, may not be accessible;",
            "videos supplied by training providers may not have captions;",
            "some features from other companies, such as live chat and payment pages, are outside our control.",
          ],
        },
        "[Full list of issues to be added after the accessibility audit.] We are working to fix these. If you find a problem not listed here, please tell us.",
      ],
    },
    {
      id: "courses-and-adjustments",
      title: "Courses and reasonable adjustments",
      blocks: [
        "Courses are delivered by independent training providers. If you need an adjustment to take part in a course or an exam, such as step-free access, extra time or a reader, please tell us when you book. We will pass your request to the provider, who is responsible for the course and its venue.",
      ],
    },
    {
      id: "feedback",
      title: "Feedback and other formats",
      blocks: [
        "If you have difficulty using any part of the website, or need information in a different format such as large print, audio or plain text, please contact us:",
        {
          type: "ul",
          items: [
            "email [hello@readtraining.co.uk](mailto:hello@readtraining.co.uk?subject=Accessibility)",
            "call [0333 344 1293](tel:03333441293), Monday to Friday, 9:00am to 5:30pm",
          ],
        },
        "We will reply within [5] working days.",
      ],
    },
    {
      id: "how-we-test",
      title: "How we test this website",
      blocks: [
        "We check pages with automated accessibility tools and by hand, using a keyboard, a screen reader and different screen sizes. [Date and scope of the full audit to be added.]",
      ],
    },
    {
      id: "complaints",
      title: "If you are not happy with our response",
      blocks: [
        "If you are not happy with how we respond to your feedback, please contact us again so we can look into it. You can also contact the [Equality Advisory and Support Service](https://www.equalityadvisoryservice.com/) (EASS) for advice.",
      ],
    },
    {
      id: "about-this-statement",
      title: "About this statement",
      blocks: [
        "This statement was prepared on 9 October 2026. We will review it at least once a year, and whenever we make major changes to the website.",
      ],
    },
  ],
};
