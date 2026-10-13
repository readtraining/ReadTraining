// ReadTraining's own draft, kept for later. Not used while the client's current hurak.com text is in data/legal/privacy.js.
// It is in the earlier shape ("In short" summaries, numbered clauses): convert it to sections of `blocks` before using it.
// Privacy Policy (DRAFT: needs review by a solicitor before launch). Read through lib/legal.js; same shape as terms.js
// (sections with an "In short" summary and clauses of blocks; see that file). Extra block: { type: "cards", items }.
//
// Covers the UK GDPR "right to be informed" list (ICO): who we are, what we collect and where from, purposes and lawful
// bases, who we share with, transfers outside the UK, retention, rights, the right to complain to the ICO.
// Third-party services are the ones the reference site (hurak.com) uses, as the client asked: Stripe (cards and Klarna),
// Google Tag Manager / Analytics / Ads, Meta Pixel, Microsoft Advertising, Zoho (PageSense, SalesIQ chat, Desk), Sentry,
// reCAPTCHA, Cloudflare, Vimeo / YouTube; plus our own database host, Supabase. Unlike the reference, analytics and
// advertising only run with consent (UK PECR), which needs a cookie consent tool before launch. Values in [brackets] are
// to be confirmed.

export const privacy = {
  slug: "privacy",
  href: "/privacy-policy",
  title: "Privacy Policy",
  description: "How ReadTraining collects, uses, shares and protects your personal information, and the rights you have over it.",
  lead: "What personal information we collect when you use ReadTraining, why we use it, who we share it with, and how you stay in control of it.",
  version: "1.0",
  published: "2026-10-09",
  updated: "2026-10-09",
  effective: "2026-10-09",
  draft: true,
  contact: {
    title: "Privacy questions?",
    text: "Ask about your information, or make a request such as a copy or deletion of your data.",
    subject: "Privacy request",
  },
  highlights: [
    { icon: "icon-badge", title: "We never sell your data", text: "We share it only to deliver your booking and run the site.", href: "#sharing" },
    { icon: "icon-search", title: "Analytics and ads need your consent", text: "Only essential storage runs until you say yes.", href: "#cookies" },
    { icon: "icon-document", title: "You stay in control", text: "Ask for a copy, a correction or deletion at any time.", href: "#your-rights" },
    { icon: "icon-message", title: "Talk to a real person", text: "Our team answers privacy questions directly.", href: "#who-we-are" },
  ],
  sections: [
    {
      id: "who-we-are",
      title: "Who we are",
      summary: "ReadTraining is responsible for your information on this website. Here is how to reach us.",
      clauses: [
        ["ReadTraining is a trading name of [Company legal name] Ltd, registered in England and Wales under company number [Company number], with its registered office at [Registered office address] (**we**, **us**). We are the controller of the personal information described in this policy, which means we decide how and why it is used."],
        ["We are registered with the Information Commissioner's Office (ICO) under registration number [ICO registration number]."],
        ["For any privacy question or request, email [hello@readtraining.co.uk](mailto:hello@readtraining.co.uk?subject=Privacy%20request) with \"Privacy request\" in the subject, or call [0333 344 1293](tel:03333441293), Monday to Friday, 9:00am to 5:30pm."],
      ],
    },
    {
      id: "scope",
      title: "Who this policy is for",
      summary: "Learners, people booking for a business, providers' contacts and visitors. Providers handle your details too, under their own policies.",
      clauses: [
        ["This policy applies to everyone who uses ReadTraining: learners, people who book for a business or ask for a quote, the contacts of training providers who list with us, and visitors to the website."],
        ["When you book a course, we pass the provider the details it needs to deliver it. The provider then uses them as a separate controller under its own privacy policy, for example to register you with an awarding body and issue your certificate."],
        ["Our [Terms and Conditions](/terms-and-conditions) explain how bookings work. This policy explains how your personal information is handled."],
      ],
    },
    {
      id: "information-we-collect",
      title: "What information do we collect?",
      summary: "What you give us, what your device sends when you use the site, and what others give us when they book for you.",
      clauses: [
        [
          "We collect the following information:",
          {
            type: "table",
            caption: "Information we collect, with examples and where it comes from",
            rows: [
              ["Type of information", "Examples", "Where it comes from"],
              ["Identity and contact", "Name, email address, phone number, the learner's name for a certificate", "You, or the person booking for you"],
              ["Account", "Login email, password (stored encrypted), saved courses", "You"],
              ["Bookings", "Courses, dates, booking option, prices, learner details, attendance and results", "You and the provider"],
              ["Payment", "Payment status, the last four digits of your card, billing address. Full card details are handled by Stripe, never by us", "You, via Stripe"],
              ["Business enquiries", "Company name, work email, number of learners, your message", "You"],
              ["Reviews and comments", "Your rating, first name, review or comment text and, if you give it, your email", "You"],
              ["Conversations", "Emails, phone notes and live chat messages", "You"],
              ["Device and usage", "IP address, browser, pages viewed, how you arrived, error reports", "Your device, through our website"],
              ["Marketing preferences", "Whether you subscribed to our newsletter and accepted analytics or advertising cookies", "You"],
            ],
          },
        ],
        ["We do not ask for special category information, such as health details. If a course needs to know about a disability or a medical condition so that it can make adjustments, you share that with the provider, who will explain how it is used."],
        ["To make a booking we need your name and email address and the learner's details. Without them we cannot take the booking."],
      ],
    },
    {
      id: "how-we-use",
      title: "How do we use your information?",
      summary: "To take and manage bookings, run your account, answer you, keep the site safe and, with your consent, measure and market.",
      clauses: [
        [
          "Data protection law requires a lawful basis for each use. We rely on the following:",
          {
            type: "table",
            caption: "What we use your information for, and the lawful basis for each use",
            rows: [
              ["What we use it for", "Information used", "Lawful basis"],
              ["Taking and managing your booking, and passing it to the provider", "Identity and contact, bookings, payment", "Contract"],
              ["Running your account and saved courses", "Account, identity and contact", "Contract"],
              ["Answering enquiries, quotes, chat and complaints", "Identity and contact, business enquiries, conversations", "Contract, or legitimate interests"],
              ["Publishing and moderating reviews and comments", "Reviews and comments", "Legitimate interests"],
              ["Preventing fraud, spam and misuse, and keeping the site secure", "Device and usage, payment, account", "Legitimate interests"],
              ["Fixing errors and improving the website", "Device and usage", "Legitimate interests"],
              ["Measuring visits with analytics", "Device and usage", "Consent"],
              ["Showing our adverts on other sites and measuring them", "Device and usage", "Consent"],
              ["Sending our newsletter and offers", "Identity and contact, marketing preferences", "Consent"],
              ["Keeping accounting and tax records", "Bookings, payment", "Legal obligation"],
            ],
          },
        ],
        ["Where we rely on **legitimate interests**, they are running a safe, reliable marketplace, helping learners choose with honest reviews, and answering business enquiries. We only rely on them where they are not outweighed by your rights."],
        ["Where we rely on **consent**, you can withdraw it at any time, for example by changing your cookie choices or unsubscribing. This does not affect anything we did before."],
        ["We do not make decisions about you based solely on automated processing that have legal or similarly significant effects."],
      ],
    },
    {
      id: "sharing",
      title: "Who do we share it with?",
      summary: "The provider of your course, and the services that help us run the site. We never sell your information.",
      clauses: [
        ["We never sell your personal information."],
        [
          "We share it only with:",
          {
            type: "table",
            caption: "Who we share your information with and why",
            rows: [
              ["Who", "Why"],
              ["The training provider of your course", "To deliver the course, register you with the awarding body and issue your certificate"],
              ["Stripe (and Klarna, through Stripe)", "To take card payments and, if you choose it, pay in instalments"],
              ["Supabase", "To host our database and accounts"],
              ["Cloudflare", "To deliver the website quickly and protect it from attacks"],
              ["Google (Tag Manager, Analytics, Ads, reCAPTCHA)", "To measure visits and adverts (with your consent) and to block spam on forms"],
              ["Meta (Facebook) and Microsoft Advertising", "To show and measure our adverts (with your consent)"],
              ["Zoho (SalesIQ, Desk, PageSense)", "To run live chat and our help desk, and (with your consent) to test page improvements"],
              ["Sentry", "To find and fix errors on the website"],
              ["Vimeo and YouTube", "To play course videos, if you choose to watch one"],
              ["[Email provider]", "To send booking emails and, with your consent, our newsletter"],
              ["Professional advisers, and authorities", "Where we need advice, or the law requires it"],
            ],
          },
        ],
        ["Our service providers only use your information on our instructions and must keep it secure. If our business is sold or reorganised, your information may pass to the new owner under this policy."],
      ],
    },
    {
      id: "payments",
      title: "How are payments handled?",
      summary: "Stripe takes your payment. Klarna may check your credit if you choose to pay in instalments.",
      clauses: [
        ["Card payments, Apple Pay and Google Pay are processed by Stripe. Your full card number goes straight to Stripe and is never stored by us. Stripe's own [privacy policy](https://stripe.com/gb/privacy) also applies."],
        ["If you choose to pay with Klarna, you will be sent to Klarna to apply. Klarna may run a credit check and is responsible for that decision under its own [privacy notice](https://www.klarna.com/uk/privacy/)."],
        ["Business customers paying by invoice share their billing contact and company details with us for invoicing and credit control."],
      ],
    },
    {
      id: "reviews-and-mock-tests",
      title: "Reviews, comments and mock tests",
      summary: "Reviews show your first name only. Mock test progress stays on your device.",
      clauses: [
        ["When we publish your review, we show your rating, your text and the first name you gave us. We never publish your email address."],
        ["You can ask us to edit or remove your review or comment at any time."],
        ["Your mock test progress and results are stored on your own device, not on our servers. We only receive your answers when you finish a test, to mark them, and we do not link them to you. Clearing your browser data deletes them."],
      ],
    },
    {
      id: "cookies",
      title: "Cookies and similar technologies",
      summary: "Essential storage makes the site work. Analytics, advertising and testing only run if you agree.",
      clauses: [
        ["Cookies and similar technologies, such as browser storage, are small files and data saved on your device. Some are essential. The others need your consent, and we ask for it when you first visit."],
        [
          {
            type: "table",
            caption: "Cookies and similar technologies we use",
            rows: [
              ["Type", "What it does", "Needs your consent?"],
              ["Essential", "Keeps your basket (rt-cart), saved courses (rt-course-wishlist), mock test progress (rt-mock), sign-in and your cookie choices, and protects forms (reCAPTCHA, Cloudflare)", "No"],
              ["Analytics", "Google Analytics, through Google Tag Manager: how many people visit and which pages they use", "Yes"],
              ["Advertising", "Google Ads, Meta Pixel and Microsoft Advertising: showing and measuring our adverts", "Yes"],
              ["Testing and chat", "Zoho PageSense tests page improvements; Zoho SalesIQ runs live chat when you open it", "Testing: yes. Chat: no"],
            ],
          },
        ],
        ["You can change your choices at any time from the cookie settings link in the website footer, and you can also clear or block cookies in your browser. Blocking essential storage may stop parts of the site working. Our [Cookie Policy](/cookie-policy) lists every cookie, what it does and how long it lasts. [Cookie settings link to be added with the consent tool.]"],
      ],
    },
    {
      id: "marketing",
      title: "Marketing emails",
      summary: "We only send our newsletter if you ask for it, and every email has an unsubscribe link.",
      clauses: [
        ["We send our newsletter and offers only if you subscribe, for example in the website footer."],
        ["Every marketing email has an unsubscribe link, or you can email us. Unsubscribing does not stop emails about your bookings."],
      ],
    },
    {
      id: "transfers",
      title: "Is your information sent outside the UK?",
      summary: "Some of our service providers are in the US or the EU. We use legal safeguards when that happens.",
      clauses: [
        ["Some of our service providers, such as Google, Meta, Microsoft, Stripe, Sentry and Cloudflare, process information in the United States or other countries outside the UK. Zoho and Supabase may process it in [the EU or the UK]."],
        ["When information leaves the UK, we make sure it is protected by an adequacy regulation (for example the UK-US Data Bridge for certified US companies, or the UK's adequacy regulations for the EU), or by the ICO's International Data Transfer Agreement or Addendum. You can ask us for details of the safeguard used."],
      ],
    },
    {
      id: "retention",
      title: "How long do we keep it?",
      summary: "Only as long as we need it, then we delete or anonymise it.",
      clauses: [
        [
          {
            type: "table",
            caption: "How long we keep each type of information",
            rows: [
              ["Information", "How long we keep it", "Why"],
              ["Bookings, invoices and payment records", "[6 years] after the end of the financial year", "UK tax and accounting law"],
              ["Your account", "While it is open, then deleted [2 years] after your last sign-in", "So you can manage bookings"],
              ["Quote requests and enquiries", "[2 years] after our last contact", "To follow up and answer questions"],
              ["Chat and support conversations", "[2 years]", "To help with follow-up questions and complaints"],
              ["Published reviews and comments", "While shown on the site, or until you ask us to remove them", "To help other learners choose"],
              ["Newsletter subscription", "Until you unsubscribe", "Your consent"],
              ["Analytics data", "[14 months]", "To compare visits over time"],
            ],
          },
        ],
        ["After these periods we delete your information or make it anonymous, so it can no longer identify you."],
      ],
    },
    {
      id: "security",
      title: "How do we keep it safe?",
      summary: "We use encryption, access controls and trusted providers to protect your information.",
      clauses: [
        ["We protect your information with encrypted connections (HTTPS), encrypted passwords, access limited to the people who need it, and providers that meet recognised security standards."],
        ["No website can be completely secure. If a breach puts your rights at risk, we will tell you and the ICO as the law requires."],
      ],
    },
    {
      id: "your-rights",
      title: "Your rights",
      summary: "You can see, correct, delete or move your information, and object to how we use it. It is free.",
      clauses: [
        [
          "You have these rights over your personal information:",
          {
            type: "cards",
            items: [
              { title: "See your information", text: "Ask for a copy of the personal information we hold about you." },
              { title: "Correct it", text: "Ask us to fix information that is wrong or incomplete." },
              { title: "Delete it", text: "Ask us to erase your information when we no longer need it." },
              { title: "Restrict its use", text: "Ask us to pause using it, for example while we check a correction." },
              { title: "Move it", text: "Ask for the information you gave us in a format you can reuse." },
              { title: "Object", text: "Object to uses based on legitimate interests, and to direct marketing at any time." },
              { title: "Withdraw consent", text: "Change your cookie choices or unsubscribe at any time." },
              { title: "Complain", text: "Tell the ICO if you are unhappy with how we handle your information." },
            ],
          },
        ],
        ["To use any of these rights, email [hello@readtraining.co.uk](mailto:hello@readtraining.co.uk?subject=Privacy%20request) with \"Privacy request\" in the subject. It is free. We may ask you to confirm your identity, and we reply within one month."],
        ["Some rights have limits; for example, we must keep booking records for tax. If we cannot do what you ask, we will explain why."],
      ],
    },
    {
      id: "children",
      title: "Children",
      summary: "Our services are for adults. Under-18s are booked by a parent, guardian or employer.",
      clauses: [
        ["Our website and services are aimed at adults. You must be 18 or over to book; a parent, guardian or employer can book for a learner under 18 where the course allows it, and gives us that learner's details."],
        ["We do not knowingly collect information from children for marketing. If you think we have, please contact us and we will delete it."],
      ],
    },
    {
      id: "complaints",
      title: "How to complain",
      summary: "Tell us first. If you are still unhappy, you can complain to the ICO.",
      clauses: [
        ["If you are unhappy with how we have handled your information, please contact us first so we can put it right."],
        ["You also have the right to complain to the Information Commissioner's Office, the UK's data protection regulator, at [ico.org.uk/make-a-complaint](https://ico.org.uk/make-a-complaint/) or on 0303 123 1113."],
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      summary: "We will update this page when things change, and tell you about important changes.",
      clauses: [
        ["We may update this policy when our services or the law change. The date and version at the top show the latest update."],
        ["If we make an important change, we will tell registered users by email, and ask again where we need your consent."],
      ],
    },
  ],
};
