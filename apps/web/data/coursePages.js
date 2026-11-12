// The course pages (/courses/[slug]) linked from the footer's "Find a course" column. Each one is the course catalogue
// (components/courses/CourseCatalogue) scoped to one study method, subject or set of courses, with its own heading, intro,
// "about" text and FAQs. Read through lib/coursePages.js. A study method's page is at its method's slug, the same word as its
// name (brief §4): /courses/classroom, /courses/live-online, /courses/self-paced (the old /courses/virtual and /courses/online
// redirect there, next.config.ts).
//
// `select` picks the courses: { method } (a study method), { subject } (a category) or { subject, sub } (one sub-category).
// Every other category gets a plain page of its own at its slug (lib/coursePages.js), so each subject in the menus has one.
// `hide` lists the filter groups the page leaves out. `filters: false` drops the filter panel: only for a page with a
// single course (Personal Licence), where there is nothing to filter; every other page has filters, so the pages look the same
// whatever the number of courses. `blog` is a blog category whose guides the page links to.

export const coursePages = [
  {
    slug: "classroom",
    label: "Classroom courses",
    title: "Classroom training courses",
    description: "Compare classroom training courses at venues across the UK, with their dates, venues and prices from approved training providers.",
    lead: "Learn face to face with a trainer at a training venue. Compare dates, venues and prices from approved providers in one place.",
    select: { method: "classroom" },
    hide: ["method"],
    about: {
      title: "About classroom training",
      text: "Classroom courses suit practical skills and qualifications that need a hands-on assessment in person. You usually train with a group, can ask questions as you go and practise the skills, not just read about them.",
    },
    faq: [
      { q: "Why choose a classroom course?", a: "Some qualifications need practical training and assessment in person, such as first aid and the physical intervention unit for door supervisors. Many people also find it easier to learn with a trainer and a group." },
      { q: "How do I find a course near me?", a: "Enter your town or postcode in the search above. Courses are sorted by the closest venue, and each course page shows its venues and dates." },
      { q: "What should I bring on the day?", a: "The training provider tells you what to bring before the course. It is usually photo ID and anything the course page lists in its entry requirements, such as a first aid certificate for SIA training." },
      { q: "Can my team train together?", a: "Ask us about in-house training for a group at your workplace, on a date that suits you. We'll check availability and the price with a provider. See training for business." },
    ],
  },
  {
    slug: "live-online",
    label: "Live online courses",
    title: "Live online training courses",
    description: "Compare live online training courses, taught by a tutor over video at set times, with their dates and prices from approved training providers.",
    lead: "Join a tutor-led class over video from home or work, at set times, with no travel.",
    select: { method: "live-online" },
    hide: ["method"],
    about: {
      title: "About live online training",
      text: "Live online courses run at set times with a trainer, over video, and you can ask questions as you go. How a course is assessed depends on the course: check its page. They suit people who want a trainer's support without travelling to a venue.",
    },
    faq: [
      { q: "What do I need for a live online course?", a: "A computer or laptop with a camera, a microphone and a stable internet connection, and a quiet place to work. You get the link to join the class before it starts." },
      { q: "Is a live online course the same as a classroom course?", a: "You learn with a trainer at set times, as in a classroom, but you join from your own space. Courses that need a practical assessment in person are not available fully online." },
      { q: "Do I need to have my camera on?", a: "Usually. Trainers often ask you to keep your camera on, so they can see you are taking part, and a course with an exam may need it to confirm your identity." },
      { q: "What certificate will I get?", a: "Each course page shows what the course leads to. Where a course runs both live online and in a classroom, it usually leads to the same qualification either way." },
    ],
  },
  {
    slug: "self-paced",
    label: "Self-paced courses",
    title: "Self-paced online courses",
    description: "Compare self-paced online courses from approved training providers, to work through in your own time.",
    lead: "Learn online at your own pace and fit study around work. Self-paced courses suit awareness and knowledge-based training.",
    select: { method: "self-paced" },
    hide: ["method"],
    about: {
      title: "About self-paced online courses",
      text: "Self-paced courses are online modules you work through in your own time, often with videos, short quizzes and a final test. They suit awareness and knowledge-based training rather than practical skills.",
    },
    faq: [
      { q: "When can I start?", a: "Once your place is confirmed, the training provider gives you access to the course. You can then start, pause and come back whenever it suits you." },
      { q: "How long do I have to finish?", a: "It depends on the course and the provider. If the course page doesn't say, ask us before you choose." },
      { q: "How will I get my certificate?", a: "The training provider issues it once you complete the course. How and when you receive it depends on the course and the provider." },
      { q: "Can I study on my phone?", a: "Many self-paced courses work on a phone or tablet as well as a computer, but it depends on the course. A larger screen can be easier for longer modules." },
    ],
  },
  {
    slug: "citb-site-safety-plus",
    label: "CITB Site Safety Plus",
    title: "CITB Site Safety Plus courses",
    description: "Compare CITB Site Safety Plus courses: SMSTS for site managers, SSSTS for supervisors and the health and safety awareness course behind the CSCS card.",
    lead: "The CITB's site safety courses for operatives, supervisors and managers. Most UK sites ask for one of them.",
    select: { subject: "construction", sub: "site-safety" },
    hide: ["subject"],
    blog: "construction",
    about: {
      title: "About CITB Site Safety Plus",
      text: "Site Safety Plus is the CITB's scheme of health and safety courses for construction. It runs from awareness training for new site workers, through the Site Supervision Safety Training Scheme (SSSTS), to the Site Management Safety Training Scheme (SMSTS) for managers.",
    },
    faq: [
      { q: "Which Site Safety Plus course do I need?", a: "It depends on your role. Supervisors and team leaders usually need SSSTS; site managers and project managers need SMSTS. New site workers start with health and safety awareness." },
      { q: "How long do the certificates last?", a: "SMSTS and SSSTS certificates are valid for five years. Take the refresher course before yours expires; once it has expired, you need the full course again." },
      { q: "How are the courses assessed?", a: "Through exercises during the course and a multiple-choice test at the end. You need to attend the whole course to pass." },
      { q: "Can I take SMSTS or SSSTS online?", a: "Some providers run them live online with a tutor, at set times. Each course shows the study methods available." },
    ],
  },
  {
    slug: "personal-licence",
    label: "Personal Licence",
    title: "Personal licence courses",
    description: "Compare courses for the Level 2 Award for Personal Licence Holders (APLH), the qualification you need to apply for a personal licence to sell alcohol.",
    lead: "The Level 2 Award for Personal Licence Holders (APLH) is the qualification you need to apply for a personal licence to sell alcohol.",
    select: { subject: "hospitality", sub: "licensing" },
    filters: false,
    blog: "hospitality",
    about: {
      title: "About the personal licence qualification",
      text: "The APLH is a one-day course covering licensing law and the responsibilities of a personal licence holder, with a short multiple-choice exam. Once you pass, you apply to your local council for the licence itself.",
    },
    faq: [
      { q: "Who needs a personal licence?", a: "Every sale of alcohol under a premises licence must be made or authorised by a personal licence holder, and each premises needs a designated premises supervisor who holds one. Managers and supervisors of pubs, bars and shops usually need it." },
      { q: "How do I get a personal licence?", a: "Pass the APLH qualification, get a basic criminal record (DBS) check, then apply to the council where you live with your certificate, photos and the fee." },
      { q: "How long does the licence last?", a: "In England and Wales, a personal licence does not need renewing. Scotland and Northern Ireland have their own rules." },
      { q: "Can I take the course online?", a: "Yes, where the course offers live online dates. The exam is taken under the conditions your trainer explains." },
    ],
  },
  {
    slug: "first-aid",
    label: "First Aid",
    title: "First aid training courses",
    description: "Compare first aid training courses across the UK, with their dates, venues and prices from approved training providers.",
    lead: "First aid training from approved training providers. Compare dates, venues and prices in one place.",
    select: { subject: "first-aid" },
    hide: ["subject"],
    blog: "first-aid",
    about: {
      title: "About first aid training",
      text: "Employers must provide adequate first aid at work, and a first aid needs assessment decides how many first aiders are needed and at what level. Each course page shows what the course covers and the certificate it leads to.",
    },
    faq: [
      { q: "Which first aid course do I need?", a: "Lower-risk workplaces often choose the one-day Emergency First Aid at Work; higher-risk workplaces choose the three-day First Aid at Work. Childcare settings need Paediatric First Aid. Your employer's first aid needs assessment decides." },
      { q: "How long is a first aid certificate valid?", a: "Workplace and paediatric first aid certificates last three years. The HSE strongly recommends a short refresher every year in between." },
      { q: "Can I do first aid training online?", a: "Courses with a practical assessment, such as First Aid at Work, need to be taken in person. Some awareness courses can be taken online: each course page shows how it is taught." },
      { q: "Do I need first aid for an SIA licence?", a: "Yes. Door supervisors and security guards need an Emergency First Aid at Work certificate, or equivalent, before their SIA training. Other SIA licences have their own first aid rules." },
    ],
  },
  {
    slug: "health-and-safety",
    label: "Health & Safety",
    title: "Health and safety courses",
    description: "Compare health and safety courses across the UK, with their dates, venues and prices from approved training providers.",
    lead: "Health and safety training from approved training providers. Compare dates, venues and prices in one place.",
    select: { subject: "health-and-safety" },
    hide: ["subject"],
    blog: "health-and-safety",
    about: {
      title: "About health and safety training",
      text: "Employers must give their staff the information and training they need to work safely. Short courses cover specific risks, and longer qualifications build wider knowledge for managers and people with health and safety duties. Each course page shows what the course covers.",
    },
    faq: [
      { q: "IOSH or NEBOSH: which should I choose?", a: "IOSH Managing Safely suits managers and supervisors who need practical safety knowledge for their team. The NEBOSH National General Certificate suits people with health and safety duties or starting a health and safety career." },
      { q: "Do health and safety certificates expire?", a: "It depends on the course. Many employers refresh short courses, such as fire marshal and manual handling, every few years, or when the work changes." },
      { q: "Can I study online?", a: "It depends on the course. Some are taught live online or at your own pace as well as in a classroom. Each course page shows the ways it is available." },
      { q: "Can you train my whole team?", a: "Ask us about in-house training for a group at your workplace, on a date that suits you. We'll check availability and the price with a provider. See training for business." },
    ],
  },
  {
    slug: "security",
    label: "Security",
    title: "Security training courses",
    description: "Compare SIA licence training courses across the UK, with their dates, venues and prices from approved training providers.",
    lead: "Training for the qualifications behind an SIA licence, from approved training providers. Compare dates, venues and prices in one place.",
    select: { subject: "security" },
    hide: ["subject"],
    blog: "security",
    about: {
      title: "About SIA licence training",
      text: "To work in a licensed security role in the UK you need an SIA licence, and to apply for one you need the right qualification. Each course page shows the qualification the course leads to.",
    },
    faq: [
      { q: "Door supervisor or security guard?", a: "A door supervisor licence covers everything a security guard licence does, plus work at licensed premises such as pubs, clubs and venues, so it gives you the widest choice of work." },
      { q: "What do I need before the course?", a: "An Emergency First Aid at Work certificate, or equivalent, and ID. Training providers also check that your English is good enough for the role." },
      { q: "How long does an SIA licence last?", a: "Front-line licences last three years. You can apply to renew up to four months before yours expires, after completing the refresher training." },
      { q: "When can I start work?", a: "Only once the SIA has granted your licence. After you pass the course, you apply to the SIA, which checks your identity and criminal record." },
    ],
  },
];
