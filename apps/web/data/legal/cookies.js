// Cookie Policy (DRAFT: needs review before launch). Read through lib/legal.js; same shape as terms.js and privacy.js.
//
// Lists the cookies and browser storage of the services in the Privacy Policy (the reference site's stack: Google Tag Manager /
// Analytics / Ads, Meta Pixel, Microsoft Advertising, Zoho PageSense and SalesIQ, reCAPTCHA, Cloudflare) and our own storage
// keys (context/Context.js, lib/wishlist.js, components/testPrep/runner/attemptStore.js). Cookie names and lifetimes are the
// providers' published defaults: confirm them with a cookie scan once the consent tool and tags are live. Under UK PECR only
// strictly necessary storage runs without consent; everything else waits for the visitor's choice. Values in [brackets] are
// to be confirmed.

export const cookies = {
  slug: "cookies",
  href: "/cookie-policy",
  title: "Cookie Policy",
  description: "Which cookies and similar technologies ReadTraining uses, what they do, how long they last and how to change your choices.",
  lead: "Which cookies and similar technologies we use, what each one does, how long it lasts, and how you can change your choices at any time.",
  version: "1.0",
  published: "2026-10-09",
  updated: "2026-10-09",
  effective: "2026-10-09",
  draft: true,
  contact: {
    title: "Questions about cookies?",
    text: "Ask us about any cookie on this page or how we use your information.",
    subject: "Cookie question",
  },
  sections: [
    {
      id: "about",
      title: "About this policy",
      blocks: [
        "Cookies are small text files that a website saves on your device. Similar technologies, such as your browser's local storage and tracking pixels, work in a similar way. In this policy we call them all **cookies**.",
        "This policy explains the cookies used on the ReadTraining website (**we**, **us**). How we use the personal information they collect is explained in our [Privacy Policy](/privacy-policy).",
      ],
    },
    {
      id: "types",
      title: "The types of cookies we use",
      blocks: [
        "We group our cookies into four types:",
        {
          type: "ul",
          items: [
            "**Essential:** make the site work: your basket, saved courses, mock test progress, sign-in, security and your cookie choices. Always on.",
            "**Analytics:** tell us how many people visit and which pages they use, so we can improve the site. Only with your consent.",
            "**Advertising:** show our adverts on other websites and measure how well they work. Only with your consent.",
            "**Testing and chat:** test page improvements (with your consent) and run live chat when you open it.",
          ],
        },
        "When you first visit, we ask which optional types you accept. Until you choose, only essential cookies are used.",
      ],
    },
    {
      id: "essential",
      title: "Essential cookies and storage",
      blocks: [
        {
          type: "table",
          caption: "Essential cookies and browser storage",
          rows: [
            ["Name", "Set by", "What it does", "How long"],
            ["rt-cart", "ReadTraining (browser storage)", "Keeps the courses in your basket", "Until you clear it"],
            ["rt-course-wishlist", "ReadTraining (browser storage)", "Remembers the courses you saved", "Until you clear it"],
            ["rt-mock, rt-mock-done", "ReadTraining (browser storage)", "Saves your mock test progress and last result on your device", "Until you clear it"],
            ["[Consent cookie]", "ReadTraining", "Remembers your cookie choices", "[12 months]"],
            ["[Session cookie]", "ReadTraining", "Keeps you signed in", "Until you sign out"],
            ["__cf_bm", "Cloudflare", "Tells people from bots, to protect the site", "30 minutes"],
            ["_GRECAPTCHA", "Google reCAPTCHA", "Protects our forms from spam", "6 months"],
          ],
        },
        "These cookies are needed for the site to work, so they are always on. If you choose to block them in your browser settings, some features, such as your basket and saved mock test progress, may not work as expected.",
      ],
    },
    {
      id: "analytics",
      title: "Analytics cookies",
      blocks: [
        {
          type: "table",
          caption: "Analytics cookies",
          rows: [
            ["Name", "Set by", "What it does", "How long"],
            ["_ga", "Google Analytics", "Tells visits apart, to count visitors", "2 years"],
            ["_ga_[ID]", "Google Analytics", "Keeps track of your current visit", "2 years"],
          ],
        },
        "Google Analytics is loaded through Google Tag Manager, which does not set cookies itself. We use the results in total only, to understand which pages help people and where the site can be improved.",
      ],
    },
    {
      id: "advertising",
      title: "Advertising cookies",
      blocks: [
        {
          type: "table",
          caption: "Advertising cookies",
          rows: [
            ["Name", "Set by", "What it does", "How long"],
            ["_gcl_au", "Google Ads", "Measures which adverts lead to bookings", "90 days"],
            ["_fbp", "Meta (Facebook, Instagram)", "Shows our adverts to people who visited and measures them", "90 days"],
            ["_uetsid", "Microsoft Advertising (Bing)", "Measures adverts during your visit", "1 day"],
            ["_uetvid", "Microsoft Advertising (Bing)", "Measures adverts across visits", "13 months"],
          ],
        },
        "These companies may also use what they collect under their own policies. See [Cookies set by other companies](#third-parties).",
      ],
    },
    {
      id: "testing-and-chat",
      title: "Testing and chat",
      blocks: [
        {
          type: "table",
          caption: "Testing and chat cookies",
          rows: [
            ["Name", "Set by", "What it does", "How long"],
            ["[PageSense cookies]", "Zoho PageSense", "Tests improvements to pages and shows anonymous click maps (with your consent)", "[To be confirmed]"],
            ["[SalesIQ cookies]", "Zoho SalesIQ", "Runs live chat and keeps your conversation when you change page", "[To be confirmed]"],
          ],
        },
        "Course pages may play videos from Vimeo or YouTube. Those services can set their own cookies when you play a video.",
      ],
    },
    {
      id: "your-choices",
      title: "Your choices",
      blocks: [
        "When you first visit, our cookie banner lets you accept all, reject all, or choose each optional type. Rejecting is as easy as accepting.",
        "You can change your choices at any time from **Cookie settings** in the website footer. [Cookie settings link to be added with the consent tool.]",
        "You can also delete or block cookies in your browser settings: see the help pages for [Chrome](https://support.google.com/chrome/answer/95647), [Edge](https://support.microsoft.com/en-gb/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09), [Firefox](https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox) and [Safari](https://support.apple.com/en-gb/guide/safari/sfri11471/mac).",
        "To opt out of personalised adverts across many sites, you can also use [Google's Ad Settings](https://adssettings.google.com/) or [Your Online Choices](https://www.youronlinechoices.com/uk/).",
      ],
    },
    {
      id: "third-parties",
      title: "Cookies set by other companies",
      blocks: [
        "These companies explain how they use the information their cookies collect:",
        {
          type: "ul",
          items: [
            "Google: [How Google uses cookies](https://policies.google.com/technologies/cookies)",
            "Meta: [Cookies Policy](https://www.facebook.com/privacy/policies/cookies/)",
            "Microsoft: [Privacy Statement](https://privacy.microsoft.com/en-gb/privacystatement)",
            "Zoho: [Cookie Policy](https://www.zoho.com/privacy/cookie-policy.html)",
            "Cloudflare: [Cookie Policy](https://www.cloudflare.com/cookie-policy/)",
          ],
        },
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      blocks: [
        "We review our cookies regularly and update this policy when they change. The date and version at the top show the latest update.",
        "If we start using a new type of optional cookie, we will ask for your consent again.",
      ],
    },
  ],
};
