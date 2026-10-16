// The course pages (/courses/[slug]) linked from the footer's "Find a course" column. Each one is the course catalogue
// (components/courses/CourseCatalogue) scoped to one study method, subject or set of courses, with its own heading, intro,
// "about" text and FAQs. Read through lib/coursePages.js. A study method's page is at its method's slug, the same word as its
// name (brief §4): /courses/classroom, /courses/live-online, /courses/self-paced (the old /courses/virtual and /courses/online
// redirect there, next.config.ts).
//
// `select` picks the courses: { method } (a study method), { subject } or { ids } (catalogue course ids).
// `hide` lists the filter groups the page leaves out. `filters: false` drops the filter panel: only for a page with a
// single course (Personal Licence), where there is nothing to filter; every other page has filters, so the pages look the same
// whatever the number of courses. `blog` is a blog category whose guides the page links to.

export const coursePages = [
  {
    slug: "classroom",
    label: "Classroom courses",
    title: "Classroom training courses",
    description: "Compare classroom training courses at venues across the UK: SIA, first aid, CSCS, health and safety and more, with dates, prices and providers.",
    lead: "Learn face to face with a qualified trainer at a venue near you. Compare dates, prices and providers in one place.",
    select: { method: "classroom" },
    hide: ["method"],
    about: {
      title: "About classroom training",
      text: "Classroom courses suit practical skills and qualifications that need a hands-on assessment, such as first aid, door supervision and site safety. You train with a group, ask questions as you go and leave with the skills practised, not just read about.",
    },
    faq: [
      { q: "Why choose a classroom course?", a: "Some qualifications need practical training and assessment in person, such as first aid and the physical intervention unit for door supervisors. Many people also find it easier to learn with a trainer and a group." },
      { q: "How do I find a course near me?", a: "Enter your town or postcode in the search above. Courses are sorted by the closest venue, and each course shows the venues and dates available." },
      { q: "What should I bring on the day?", a: "Your joining instructions list what to bring. It is usually photo ID, a pen and anything your course asks for, such as a first aid certificate for SIA training." },
      { q: "Can I book a classroom course for my team?", a: "Yes. You can book several places at once, or ask for the course to be run at your workplace. See training for business for group bookings." },
    ],
  },
  {
    slug: "live-online",
    label: "Live online courses",
    title: "Live online training courses",
    description: "Compare live online training courses, taught by a tutor over video: health and safety, first aid awareness, hospitality, business and more.",
    lead: "Join a tutor-led class over video from home or work. You get the same trainer and group as a classroom, with no travel.",
    select: { method: "live-online" },
    hide: ["method"],
    about: {
      title: "About live online training",
      text: "Live online courses run at set times with a qualified trainer, over video. You can ask questions, join group activities and take any assessment online. They suit people who want a trainer's support without travelling to a venue.",
    },
    faq: [
      { q: "What do I need for a live online course?", a: "A computer or laptop with a camera, a microphone and a stable internet connection, and a quiet place to work. Your joining instructions explain how to join the class." },
      { q: "Is a live online course the same as a classroom course?", a: "You cover the same content with a qualified trainer, at set times. The difference is that you join from your own space. Courses with a practical assessment, such as First Aid at Work, are not available fully online." },
      { q: "Do I need to have my camera on?", a: "Most trainers ask you to keep your camera on, so they can see you are taking part. For courses with an exam, it may be needed to confirm your identity." },
      { q: "Will I get the same certificate?", a: "Yes. A live online course leads to the same qualification or certificate as the classroom version of that course." },
    ],
  },
  {
    slug: "self-paced",
    label: "Self-paced courses",
    title: "Self-paced online courses",
    description: "Compare online self-paced courses you can start today: food hygiene, health and safety, care, business and more, at your own pace.",
    lead: "Start today and learn at your own pace, on any device. Ideal for awareness training and fitting study around work.",
    select: { method: "self-paced" },
    hide: ["method"],
    about: {
      title: "About self-paced online courses",
      text: "Self-paced courses are online modules you work through in your own time, often with videos, short quizzes and a final test. They suit awareness and knowledge-based training, such as food hygiene, manual handling and asbestos awareness.",
    },
    faq: [
      { q: "When can I start?", a: "Straight after booking. You receive your login details by email and can start, pause and come back whenever it suits you." },
      { q: "How long do I have to finish?", a: "Each course shows its access period. Most give you plenty of time to complete it at your own pace." },
      { q: "How will I get my certificate?", a: "Once you pass the final test, you can usually download your certificate straight away." },
      { q: "Can I study on my phone?", a: "Most self-paced courses work on a phone, tablet or computer. A larger screen can be easier for longer modules." },
    ],
  },
  {
    slug: "citb-site-safety-plus",
    label: "CITB Site Safety Plus",
    title: "CITB Site Safety Plus courses",
    description: "Compare CITB Site Safety Plus courses: SMSTS for site managers, SSSTS for supervisors and the health and safety awareness course behind the CSCS card.",
    lead: "The CITB's site safety courses for operatives, supervisors and managers. Most UK sites ask for one of them.",
    select: { ids: [10, 11, 9] },
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
    description: "Book the Level 2 Award for Personal Licence Holders (APLH), the qualification you need to apply for a personal licence to sell alcohol.",
    lead: "The Level 2 Award for Personal Licence Holders (APLH) is the qualification you need to apply for a personal licence to sell alcohol.",
    select: { ids: [21] },
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
    description: "Compare first aid courses across the UK: Emergency First Aid at Work, First Aid at Work, paediatric and mental health first aid.",
    lead: "Workplace, paediatric and mental health first aid courses, from one-day emergency training to the full three-day qualification.",
    select: { subject: "first-aid" },
    hide: ["subject"],
    blog: "first-aid",
    about: {
      title: "About first aid training",
      text: "Employers must provide adequate first aid at work, and a first aid needs assessment decides how many first aiders are needed and at what level. Our courses cover lower-risk workplaces (Emergency First Aid at Work), higher-risk workplaces (First Aid at Work), childcare (Paediatric First Aid) and mental health.",
    },
    faq: [
      { q: "Which first aid course do I need?", a: "Lower-risk workplaces often choose the one-day Emergency First Aid at Work; higher-risk workplaces choose the three-day First Aid at Work. Childcare settings need Paediatric First Aid. Your employer's first aid needs assessment decides." },
      { q: "How long is a first aid certificate valid?", a: "Workplace and paediatric first aid certificates last three years. The HSE strongly recommends a short refresher every year in between." },
      { q: "Can I do first aid training online?", a: "Courses with a practical assessment, such as First Aid at Work, need to be taken in person. Awareness courses, such as mental health first aid awareness, can be taken online." },
      { q: "Do I need first aid for an SIA licence?", a: "Yes. Door supervisors and security guards need an Emergency First Aid at Work certificate, or equivalent, before their SIA training. Close protection needs First Aid at Work." },
    ],
  },
  {
    slug: "health-and-safety",
    label: "Health & Safety",
    title: "Health and safety courses",
    description: "Compare health and safety courses: IOSH Managing Safely, the NEBOSH National General Certificate, fire marshal, manual handling and more.",
    lead: "From short awareness courses to recognised qualifications for managers and health and safety professionals.",
    select: { subject: "health-and-safety" },
    hide: ["subject"],
    blog: "health-and-safety",
    about: {
      title: "About health and safety training",
      text: "Employers must give their staff the information and training they need to work safely. Short courses, such as manual handling and fire marshal training, cover specific risks; IOSH Managing Safely and the NEBOSH General Certificate build wider knowledge for managers and health and safety roles.",
    },
    faq: [
      { q: "IOSH or NEBOSH: which should I choose?", a: "IOSH Managing Safely suits managers and supervisors who need practical safety knowledge for their team. The NEBOSH National General Certificate suits people with health and safety duties or starting a health and safety career." },
      { q: "Do health and safety certificates expire?", a: "It depends on the course. Many employers refresh short courses, such as fire marshal and manual handling, every few years, or when the work changes." },
      { q: "Can I study online?", a: "Yes. Many health and safety courses are available live online or self-paced. Each course shows its study methods." },
      { q: "Can you train my whole team?", a: "Yes. Book several places, or ask for a course at your workplace through training for business." },
    ],
  },
  {
    slug: "security",
    label: "Security",
    title: "Security training courses",
    description: "Compare SIA licence training courses: door supervisor, security guard, CCTV operator, close protection and refresher training.",
    lead: "SIA licence training for door supervisors, security guards, CCTV operators and close protection, plus the refresher you need to renew.",
    select: { subject: "security" },
    hide: ["subject"],
    blog: "security",
    about: {
      title: "About SIA licence training",
      text: "To work in a licensed security role in the UK you need an SIA licence, and to apply for one you need the right qualification. Our courses lead to the qualifications for each licence, and the refresher course for renewing a door supervisor or security guard licence.",
    },
    faq: [
      { q: "Door supervisor or security guard?", a: "A door supervisor licence covers everything a security guard licence does, plus work at licensed premises such as pubs, clubs and venues, so it gives you the widest choice of work." },
      { q: "What do I need before the course?", a: "An Emergency First Aid at Work certificate, or equivalent, and ID. Training providers also check that your English is good enough for the role." },
      { q: "How long does an SIA licence last?", a: "Front-line licences last three years. You can apply to renew up to four months before yours expires, after completing the refresher training." },
      { q: "When can I start work?", a: "Only once the SIA has granted your licence. After you pass the course, you apply to the SIA, which checks your identity and criminal record." },
    ],
  },
];
