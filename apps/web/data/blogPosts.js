// The blog (/blog, /blog/[slug]). Read only through lib/blog.js, which will call a CMS or the API when one exists.
// Topics follow the client's current blog (hurak.com/blog: SIA, first aid, construction, health and safety, hospitality); the
// articles are our own, checked against the official sources each one lists. A block is a paragraph or { type: "ul" | "table" },
// as on the legal pages (components/doc/DocBlocks). `related` lists catalogue course ids for "Courses on this topic".

import { CATALOGUE_HREF } from "@/lib/routes";

export const blogPage = {
  title: "Blog: training guides and advice | ReadTraining",
  description: "Practical guides to UK licences, cards and qualifications: SIA licences, first aid, CSCS cards, site safety, fire safety and alcohol licensing.",
  hero: {
    eyebrow: "ReadTraining blog",
    title: ["Guides to help you train", "and work with confidence"],
    lead: "Plain-English guides to the licences, cards and qualifications UK employers ask for, checked against the official rules.",
  },
  // the article list: its heading, the "all" chip, the filter label and the featured card's tag and link cue
  list: { eyebrow: "Articles", title: "Latest articles", allLabel: "All", filterLabel: "Filter articles by topic", featured: "Latest", read: "Read article" },
  // the article pages' sections after the text
  article: {
    sources: "Official sources",
    note: "This guide is general information, checked when it was published. Rules and fees change, so check the official sources before you rely on it.",
    courses: { title: "Courses on this topic", text: "Compare dates, prices and providers near you." },
    more: { title: "Keep reading", link: "All articles" },
  },
  cta: {
    title: "Ready to book your training?",
    text: "Compare accredited courses, dates and prices from providers across the UK.",
    primary: { label: "Find courses", href: CATALOGUE_HREF },
    secondary: { label: "Visit the help centre", href: "/help-centre" },
  },
};

export const blogCategories = [
  { key: "security", label: "Security", icon: "icon-person-3" },
  { key: "first-aid", label: "First aid", icon: "icon-badge" },
  { key: "construction", label: "Construction", icon: "icon-architecture" },
  { key: "health-and-safety", label: "Health and safety", icon: "icon-tools" },
  { key: "hospitality", label: "Hospitality", icon: "icon-friend" },
];

export const blogAuthor = "ReadTraining editorial team";

export const blogPosts = [
  {
    slug: "how-to-renew-your-sia-licence",
    category: "security",
    title: "How to renew your SIA licence",
    summary: "When to apply, the refresher training and first aid you need, and how to avoid a gap in your licence.",
    lead: "A front-line SIA licence lasts three years. Renewing on time keeps you working, and the steps are simple once you know the order.",
    published: "2026-09-22",
    updated: "2026-10-01",
    related: [46, 5, 1],
    sources: [
      { label: "Renew your SIA licence (GOV.UK)", href: "https://www.gov.uk/guidance/renew-your-sia-licence" },
      { label: "Security Industry Authority (GOV.UK)", href: "https://www.gov.uk/government/organisations/security-industry-authority" },
    ],
    sections: [
      {
        id: "when-to-apply",
        title: "When to apply",
        blocks: [
          "You can apply to renew up to four months before your current licence expires. Apply as early as you can: checks take time, and you cannot work in a licensed role once your licence has expired.",
          "Renewing early does not cost you time on your licence. Any months left on your current licence are added to the new one.",
          "If your licence has already expired, you cannot renew it. You need to apply for a new licence instead.",
        ],
      },
      {
        id: "refresher-training",
        title: "Refresher training",
        blocks: [
          "Door supervisors and security guards need a refresher qualification before they renew. It updates your skills on topics the SIA has added since you qualified, such as terror threat awareness and keeping vulnerable people safe.",
          {
            type: "table",
            caption: "Refresher training by licence",
            rows: [
              ["Licence", "Refresher you need"],
              ["Door supervisor", "Level 2 Award for Door Supervisors in the Private Security Industry (Refresher)"],
              ["Security guard", "Level 2 Award for Security Officers in the Private Security Industry (Refresher)"],
              ["Close protection", "The close protection refresher, or the door supervisor refresher if you switch to a door supervisor licence"],
            ],
          },
          "Book your refresher well before your licence is due. Courses near busy renewal periods fill quickly.",
        ],
      },
      {
        id: "first-aid",
        title: "The first aid you need",
        blocks: [
          "Before you can start the door supervisor or security guard refresher, you need an **Emergency First Aid at Work** certificate, or an equivalent. It must be valid for at least another 12 months, and your training provider will ask to see it when you register.",
          "Close protection operatives need a level 3 first aid qualification, such as **First Aid at Work**.",
          "If your first aid certificate is close to expiry, book the first aid course first, then the refresher.",
        ],
      },
      {
        id: "how-to-renew",
        title: "How to renew, step by step",
        blocks: [
          {
            type: "ul",
            items: [
              "**Check your dates.** Note when your SIA licence and your first aid certificate expire.",
              "**Get your first aid certificate** if it will not be valid for at least 12 more months.",
              "**Complete the refresher training** for your licence.",
              "**Apply through your SIA online account.** Have your ID documents and five years of address history ready, and pay the licence fee. Your employer may pay the fee or apply for you once your accounts are linked.",
              "**Wait for the decision** and keep your old licence until the new one arrives.",
            ],
          },
          "The licence fee changes from time to time. Check the current fee on GOV.UK before you apply.",
        ],
      },
      {
        id: "after-you-apply",
        title: "After you apply",
        blocks: [
          "The SIA checks your identity, your right to work and your criminal record. Most applications are decided within a few weeks, but it can take longer if anything needs checking.",
          "Employers can confirm your licence on the SIA's register of licence holders. You can find the link on our [certificate checker](/certificate-checker) page.",
        ],
      },
      {
        id: "common-mistakes",
        title: "Mistakes that cause delays",
        blocks: [
          {
            type: "ul",
            items: [
              "**Leaving it to the last month.** If checks take longer than expected, you could be unable to work for weeks.",
              "**Letting your first aid lapse.** Without a valid certificate you cannot start the refresher, so the whole renewal waits.",
              "**Gaps in your address history.** Give every address for the last five years, with dates that join up.",
              "**Out-of-date ID.** Check that your passport or driving licence will still be valid when you apply.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "door-supervisor-or-security-guard",
    category: "security",
    title: "Door supervisor or security guard: which SIA licence do you need?",
    summary: "What each licence lets you do, how the training differs and which one gives you more choice of work.",
    lead: "Both licences start a career in security, but they open different doors. Here is how to choose the right one before you book.",
    published: "2026-08-18",
    related: [1, 2, 47],
    sources: [{ label: "Security Industry Authority (GOV.UK)", href: "https://www.gov.uk/government/organisations/security-industry-authority" }],
    sections: [
      {
        id: "what-each-covers",
        title: "What each licence lets you do",
        blocks: [
          "A **security guard** licence covers guarding premises, property and people: offices, shops, building sites, events and similar places.",
          "A **door supervisor** licence covers everything a security guard does, plus work at licensed premises such as pubs, bars, clubs and venues where alcohol is sold or entry is controlled.",
          "That is why many people choose door supervisor training even if they plan to work in guarding: it covers both kinds of work.",
        ],
      },
      {
        id: "training",
        title: "How the training differs",
        blocks: [
          {
            type: "table",
            caption: "Door supervisor and security guard training compared",
            rows: [
              ["", "Door supervisor", "Security guard"],
              ["Qualification", "Level 2 Award for Door Supervisors", "Level 2 Award for Security Officers"],
              ["Extra topics", "Licensing law, searching, drugs awareness and physical intervention skills", "Guarding duties and patrols"],
              ["Course length", "Longer, because of the physical intervention unit", "Shorter"],
              ["Work it allows", "Licensed premises and guarding", "Guarding only"],
            ],
          },
          "Both courses include conflict management, and both need an Emergency First Aid at Work certificate before you start.",
        ],
      },
      {
        id: "which-to-choose",
        title: "Which one to choose",
        blocks: [
          {
            type: "ul",
            items: [
              "Choose **door supervisor** if you want to work at venues, events or nights out, or if you want the widest choice of jobs.",
              "Choose **security guard** if you are sure you want guarding work only, such as retail, corporate or site security.",
              "If you are not sure, door supervisor keeps both options open for the same three-year licence.",
            ],
          },
        ],
      },
      {
        id: "before-you-book",
        title: "Before you book",
        blocks: [
          "For either course, you need to:",
          {
            type: "ul",
            items: [
              "be 18 or over to apply for the licence",
              "have the right to work in the UK",
              "hold an Emergency First Aid at Work certificate, or an equivalent",
              "be able to read, write and speak English well enough for the role. Training providers check this before the course starts.",
            ],
          },
          "The SIA also checks your identity and criminal record when you apply for the licence. Some convictions can lead to a refusal, so check the SIA's criteria first if you are unsure.",
        ],
      },
      {
        id: "at-work",
        title: "Once you are working",
        blocks: [
          "Whichever licence you hold, you must wear it where it can be seen while you work, unless your role allows otherwise. Both licences last three years, and both need a refresher course to renew. Our guide to [renewing your SIA licence](/blog/how-to-renew-your-sia-licence) explains the steps.",
          "If you start with a security guard licence and later want door supervisor work, you need the door supervisor qualification and a door supervisor licence.",
        ],
      },
      {
        id: "next-steps",
        title: "Next steps",
        blocks: [
          "Once you pass the course, you apply to the SIA for your licence. You cannot work in a licensed role until the licence is granted.",
          "To practise for the exams, try our free [SIA mock tests](/test-prep).",
        ],
      },
    ],
  },
  {
    slug: "how-long-is-a-first-aid-certificate-valid",
    category: "first-aid",
    title: "How long is a first aid certificate valid in the UK?",
    summary: "How long workplace and paediatric first aid certificates last, and how to renew before they expire.",
    lead: "Most first aid certificates last three years. What you do before the expiry date decides whether you need a refresher or the full course again.",
    published: "2026-09-08",
    related: [5, 6, 7],
    sources: [
      { label: "First aid at work (HSE)", href: "https://www.hse.gov.uk/firstaid/" },
      { label: "First aid FAQs (HSE)", href: "https://www.hse.gov.uk/firstaid/faqs.htm" },
      { label: "First aid at work, guidance L74 (HSE)", href: "https://www.hse.gov.uk/pubns/books/l74.htm" },
    ],
    sections: [
      {
        id: "how-long",
        title: "How long certificates last",
        blocks: [
          {
            type: "table",
            caption: "How long first aid certificates are valid",
            rows: [
              ["Certificate", "Valid for", "To renew"],
              ["Emergency First Aid at Work (EFAW)", "3 years", "Take the 1-day course again"],
              ["First Aid at Work (FAW)", "3 years", "Take the 2-day requalification course before it expires"],
              ["Paediatric First Aid", "3 years", "Take the course again before it expires"],
            ],
          },
          "The expiry date is printed on your certificate. Your employer may keep a record of it too.",
        ],
      },
      {
        id: "before-expiry",
        title: "Renew before the expiry date",
        blocks: [
          "For First Aid at Work, the shorter requalification course is only open to you while your certificate is in date. If it expires, you have to take the full three-day course again.",
          "Book your renewal a few months early. That gives you time to find a date that suits you and your employer.",
        ],
      },
      {
        id: "annual-refreshers",
        title: "Annual refreshers",
        blocks: [
          "The Health and Safety Executive (HSE) strongly recommends a short refresher every year between certificates. Skills such as CPR fade quickly if they are not used.",
          "Annual refreshers are not a legal requirement, but many employers include them in their training plan.",
        ],
      },
      {
        id: "who-decides",
        title: "Who decides the training you need",
        blocks: [
          "Employers decide how many first aiders they need, and at what level, through a first aid needs assessment. There are no fixed numbers: it depends on the work, the hazards and the number of people on site.",
          "As a rule, lower-risk workplaces often choose Emergency First Aid at Work, and higher-risk workplaces choose First Aid at Work. Read our guide to [choosing between the two](/blog/emergency-first-aid-or-first-aid-at-work).",
        ],
      },
      {
        id: "if-it-expires",
        title: "If your certificate expires",
        blocks: [
          "Once the expiry date passes, you no longer count as a trained first aider at work. Your employer may need to arrange cover until you retrain, and for First Aid at Work you will need the full three-day course again.",
          "If you need first aid for an SIA licence, check that your certificate will still be valid for at least 12 months when you start your security training.",
        ],
      },
      {
        id: "for-employers",
        title: "A checklist for employers",
        blocks: [
          {
            type: "ul",
            items: [
              "Keep a list of your first aiders, their certificate type and the expiry date.",
              "Book renewals three to six months before certificates expire.",
              "Plan cover for holidays, shifts and sickness, so a first aider is always available.",
              "Review your first aid needs assessment when your work, your site or your team changes.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "emergency-first-aid-or-first-aid-at-work",
    category: "first-aid",
    title: "Emergency First Aid at Work or First Aid at Work: which course?",
    summary: "The difference between the 1-day and 3-day workplace first aid courses, and how employers choose.",
    lead: "Both courses train workplace first aiders. The right one depends on the risks in your workplace, not on which is quicker.",
    published: "2026-07-21",
    related: [5, 6, 8],
    sources: [
      { label: "First aid at work (HSE)", href: "https://www.hse.gov.uk/firstaid/" },
      { label: "First aid at work, guidance L74 (HSE)", href: "https://www.hse.gov.uk/pubns/books/l74.htm" },
    ],
    sections: [
      {
        id: "at-a-glance",
        title: "The two courses at a glance",
        blocks: [
          {
            type: "table",
            caption: "Emergency First Aid at Work and First Aid at Work compared",
            rows: [
              ["", "Emergency First Aid at Work", "First Aid at Work"],
              ["Length", "1 day", "3 days"],
              ["Covers", "CPR, choking, bleeding, shock, burns and minor injuries", "Everything in the 1-day course, plus injuries to bones and joints, head and spinal injuries, and illnesses such as heart attack, stroke and diabetic emergencies"],
              ["Suits", "Lower-risk workplaces, such as offices and shops", "Higher-risk workplaces, or larger sites"],
              ["Valid for", "3 years", "3 years"],
            ],
          },
        ],
      },
      {
        id: "how-to-choose",
        title: "How employers choose",
        blocks: [
          "Employers must provide adequate first aid. To decide what is adequate, they carry out a first aid needs assessment, which looks at:",
          {
            type: "ul",
            items: [
              "the hazards of the work, such as machinery, chemicals or work at height",
              "how many people work on site, and whether they work alone or on shifts",
              "how far the site is from emergency services",
              "any history of accidents or illness",
            ],
          },
          "The assessment shows how many first aiders you need, and whether they need the 1-day or the 3-day course. Some workplaces have both.",
        ],
      },
      {
        id: "on-the-course",
        title: "What happens on the course",
        blocks: [
          "Both courses are mostly practical. You practise CPR on a manikin, put people in the recovery position and treat staged injuries, with short theory sessions in between.",
          "Your trainer assesses you throughout, through practical demonstrations and questions. There is no long written exam, and you receive your certificate once you pass.",
          "Wear comfortable clothes: you will spend time kneeling on the floor.",
        ],
      },
      {
        id: "other-courses",
        title: "Other first aid courses",
        blocks: [
          {
            type: "ul",
            items: [
              "**Paediatric First Aid** covers babies and children, for nurseries, childminders and schools.",
              "**Mental Health First Aid** helps you spot the signs of poor mental health and support a colleague. It does not replace physical first aid training.",
            ],
          },
        ],
      },
      {
        id: "security-work",
        title: "First aid for SIA licences",
        blocks: [
          "If you are training for an SIA door supervisor or security guard licence, you need an Emergency First Aid at Work certificate before you start. Close protection needs First Aid at Work.",
        ],
      },
      {
        id: "booking",
        title: "Booking for a team",
        blocks: [
          "If you are training several people, a course at your workplace can be easier than sending staff to a venue. See [training for business](/for-business) for group bookings.",
        ],
      },
    ],
  },
  {
    slug: "how-to-get-a-cscs-labourer-card",
    category: "construction",
    title: "How to get a CSCS Labourer card",
    summary: "The qualification, the test and the application for the green CSCS card most labourers need on site.",
    lead: "Most building sites ask workers to show a CSCS card. For labouring work, that is the green Labourer card. Here is how to get one.",
    published: "2026-08-04",
    related: [9, 48, 12],
    sources: [
      { label: "Labourer card (CSCS)", href: "https://www.cscs.uk.com/card-type/labourer/" },
      { label: "CSCS", href: "https://www.cscs.uk.com/" },
    ],
    sections: [
      {
        id: "what-you-need",
        title: "What you need",
        blocks: [
          "To apply for the Labourer card you need two things:",
          {
            type: "ul",
            items: [
              "**A health and safety qualification**, usually the Level 1 Award in Health and Safety in a Construction Environment, or another one CSCS accepts.",
              "**A pass in the CITB Health, Safety and Environment (HS&E) test** for operatives.",
            ],
          },
          "The card is for unskilled labouring work. If you have a trade qualification, you may be able to apply for a different card.",
        ],
      },
      {
        id: "the-test",
        title: "The HS&E test",
        blocks: [
          "The test is taken on a computer at a test centre or online with a remote invigilator. It checks your knowledge of site safety: hazards, working at height, manual handling, fire, and your own and other people's safety.",
          "Practise before you book. Our free [CSCS mock tests](/test-prep) use the same topics.",
        ],
      },
      {
        id: "applying",
        title: "Applying for the card",
        blocks: [
          "Once you have your qualification and your test pass, you apply to CSCS online or through the My CSCS app. You will need your test ID and your qualification details.",
        ],
      },
      {
        id: "how-long",
        title: "How long it lasts",
        blocks: [
          "Your first Labourer card is valid for two years. If you are still working as a labourer, you can then renew it for a further five years by confirming your labouring work.",
          "Rules for renewals change from time to time, so check the CSCS website before your card expires.",
        ],
      },
      {
        id: "moving-up",
        title: "Moving up from the Labourer card",
        blocks: [
          "The Labourer card is a starting point. As you gain skills and qualifications, you can apply for a different card. For example, a Level 2 NVQ in your trade can lead to the blue Skilled Worker card.",
          "Supervisors and managers usually need further training too, such as the CITB site safety courses. Our guide to [SMSTS and SSSTS](/blog/smsts-or-sssts) explains which one fits your role.",
        ],
      },
      {
        id: "tips",
        title: "Tips for test day",
        blocks: [
          {
            type: "ul",
            items: [
              "Bring the ID your booking confirmation asks for. Without it, you may not be allowed to sit the test.",
              "Arrive early, or set up your room and computer in good time for an online test.",
              "Read each question fully. Some questions ask for more than one answer.",
              "Take a few mock tests first, so the question style feels familiar.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "smsts-or-sssts",
    category: "construction",
    title: "SMSTS or SSSTS: which site safety course do you need?",
    summary: "The CITB courses for site managers and supervisors compared: who each is for, how long they take and how to renew.",
    lead: "Both are CITB Site Safety Plus courses, and many principal contractors ask for one of them. The right one depends on your role on site.",
    published: "2026-07-07",
    related: [10, 11, 9],
    sources: [{ label: "CITB", href: "https://www.citb.co.uk/" }],
    sections: [
      {
        id: "compared",
        title: "The two courses compared",
        blocks: [
          {
            type: "table",
            caption: "SMSTS and SSSTS compared",
            rows: [
              ["", "SMSTS", "SSSTS"],
              ["Full name", "Site Management Safety Training Scheme", "Site Supervision Safety Training Scheme"],
              ["Who it is for", "Site managers, project managers and senior supervisors", "Supervisors, team leaders and first-line managers"],
              ["Course length", "5 days", "2 days"],
              ["Refresher", "2 days", "1 day"],
              ["Valid for", "5 years", "5 years"],
            ],
          },
        ],
      },
      {
        id: "which-one",
        title: "Which one is right for you",
        blocks: [
          "Choose **SMSTS** if you plan, organise and control work on site, or manage other supervisors. It covers the law, risk assessment and managing safety across a project.",
          "Choose **SSSTS** if you supervise a team day to day. It covers your duties as a supervisor and how to keep your team safe.",
          "If your employer or principal contractor names a course, follow what they ask for.",
        ],
      },
      {
        id: "what-they-cover",
        title: "What the courses cover",
        blocks: [
          "Both courses cover the main health and safety law for construction, including the Construction (Design and Management) Regulations 2015, along with risk assessments, method statements and common site hazards such as work at height, excavations and manual handling.",
          "SMSTS goes further into managing safety across a whole project: planning, monitoring, managing subcontractors and leading a safety culture. SSSTS focuses on what a supervisor does day to day, such as toolbox talks and checking that work follows the plan.",
        ],
      },
      {
        id: "assessment",
        title: "How you are assessed",
        blocks: [
          "On both courses, you complete exercises and take part in group work, then sit a short multiple-choice test at the end. You need to attend the whole course to pass.",
          "Once you pass, you receive a CITB certificate. Employers can check it with CITB.",
        ],
      },
      {
        id: "renewing",
        title: "Renewing before it expires",
        blocks: [
          "To take the shorter refresher course, your certificate must still be in date. There is no grace period: if it expires, you need to take the full course again.",
          "Book the refresher a few months before your certificate expires to be sure of a place.",
        ],
      },
    ],
  },
  {
    slug: "what-does-a-fire-marshal-do",
    category: "health-and-safety",
    title: "What does a fire marshal do?",
    summary: "The duties of a fire marshal or fire warden, the law behind the role and the training that helps.",
    lead: "Fire marshals, also called fire wardens, help keep a workplace safe from fire and lead people out if the alarm sounds.",
    published: "2026-08-25",
    related: [16, 5, 13],
    sources: [{ label: "Fire safety in the workplace (GOV.UK)", href: "https://www.gov.uk/workplace-fire-safety-your-responsibilities" }],
    sections: [
      {
        id: "the-law",
        title: "Why workplaces need them",
        blocks: [
          "In England and Wales, the Regulatory Reform (Fire Safety) Order 2005 makes the person responsible for a building, usually the employer or owner, responsible for fire safety. They must carry out a fire risk assessment and appoint competent people to help put fire safety measures in place.",
          "Fire marshals are often those people. The law does not set a fixed number: it depends on the size and layout of the building, the people in it and the risks found in the fire risk assessment.",
        ],
      },
      {
        id: "duties",
        title: "Everyday duties",
        blocks: [
          {
            type: "ul",
            items: [
              "checking that fire exits and escape routes are clear",
              "checking that fire doors close properly and are not wedged open",
              "making sure extinguishers are in place and have not been used or damaged",
              "reporting hazards, such as overloaded sockets or stored rubbish",
              "helping with fire drills and making sure new staff know the procedure",
            ],
          },
        ],
      },
      {
        id: "in-an-emergency",
        title: "When the alarm sounds",
        blocks: [
          "In an emergency, a fire marshal helps everyone leave safely. That usually means checking their area is empty, guiding people to the nearest safe exit, helping anyone who needs assistance and reporting to the person in charge at the assembly point.",
          "Fire marshals only use an extinguisher on a small fire, if they are trained to and it is safe. Their first job is to get people out.",
        ],
      },
      {
        id: "training",
        title: "The training",
        blocks: [
          "Fire marshal training is usually half a day to a day. It covers how fire starts and spreads, the hazards in a typical workplace, evacuation procedures and the types of extinguisher.",
          "Many organisations refresh the training every few years, or sooner if the building or the procedures change.",
        ],
      },
      {
        id: "people-who-need-help",
        title: "People who need help to leave",
        blocks: [
          "Some people need help to leave a building safely, for example because of a disability, an injury or pregnancy. A personal emergency evacuation plan (PEEP) sets out how they will get out, and who will help.",
          "Fire marshals should know who has a plan in their area and what their part in it is.",
        ],
      },
      {
        id: "scotland-and-ni",
        title: "Scotland and Northern Ireland",
        blocks: [
          "Scotland and Northern Ireland have their own fire safety laws, but the duties are similar: assess the risks, put fire safety measures in place and make sure people know what to do in a fire.",
        ],
      },
    ],
  },
  {
    slug: "iosh-managing-safely-or-nebosh",
    category: "health-and-safety",
    title: "IOSH Managing Safely or NEBOSH General Certificate?",
    summary: "Two well-known health and safety qualifications compared: who they are for, what they involve and where they lead.",
    lead: "Both are respected health and safety qualifications, but they are aimed at different people. Choosing well saves you time and money.",
    published: "2026-09-29",
    related: [13, 14, 15],
    sources: [
      { label: "IOSH", href: "https://iosh.com/" },
      { label: "NEBOSH National General Certificate", href: "https://www.nebosh.org.uk/qualifications/national-general-certificate/" },
    ],
    sections: [
      {
        id: "compared",
        title: "The two qualifications compared",
        blocks: [
          {
            type: "table",
            caption: "IOSH Managing Safely and NEBOSH National General Certificate compared",
            rows: [
              ["", "IOSH Managing Safely", "NEBOSH National General Certificate"],
              ["Who it is for", "Managers and supervisors in any sector", "People with health and safety duties, and those starting a health and safety career"],
              ["Length", "Usually 3 to 4 days", "Usually around 10 days, or longer part time"],
              ["Assessment", "A short test and a risk assessment project", "An open-book exam and a practical risk assessment"],
              ["Depth", "Practical safety management for your team", "Detailed knowledge of health and safety law and practice"],
            ],
          },
        ],
      },
      {
        id: "choose-iosh",
        title: "When IOSH Managing Safely is right",
        blocks: [
          "Choose IOSH Managing Safely if health and safety is part of your role rather than your whole job. It helps managers spot hazards, assess risks and understand their duties, without the time a full certificate takes.",
        ],
      },
      {
        id: "choose-nebosh",
        title: "When NEBOSH is right",
        blocks: [
          "Choose the NEBOSH National General Certificate if you are, or want to become, a health and safety adviser or officer. Many employers ask for it in health and safety job adverts, and it can lead on to higher qualifications.",
        ],
      },
      {
        id: "ways-to-study",
        title: "Ways to study",
        blocks: [
          "Both qualifications can be studied in a classroom, live online with a tutor or at your own pace online. Self-paced study suits people who cannot take a block of days away from work, but it needs discipline: set aside regular time each week.",
          "Whichever way you study, the practical risk assessment is based on a real workplace, so you need access to one.",
        ],
      },
      {
        id: "both",
        title: "Can you take both?",
        blocks: [
          "Yes. Some people start with IOSH Managing Safely and move on to NEBOSH as their role grows. You do not need one to take the other.",
          "To check a NEBOSH certificate someone has given you, use NEBOSH's online verification. You can find the link on our [certificate checker](/certificate-checker) page.",
        ],
      },
    ],
  },
  {
    slug: "do-you-need-a-personal-licence-to-sell-alcohol",
    category: "hospitality",
    title: "Do you need a personal licence to sell alcohol?",
    summary: "Who needs a personal licence in England and Wales, how to get one and what it lets you do.",
    lead: "Not everyone behind the bar needs a personal licence, but every sale of alcohol must be authorised by someone who has one.",
    published: "2026-09-15",
    related: [21, 20, 49],
    sources: [
      { label: "Personal licence to sell alcohol (GOV.UK)", href: "https://www.gov.uk/find-licences/personal-licence-to-sell-alcohol" },
      { label: "Alcohol licensing (GOV.UK)", href: "https://www.gov.uk/guidance/alcohol-licensing" },
    ],
    sections: [
      {
        id: "who-needs-one",
        title: "Who needs one",
        blocks: [
          "This guide covers England and Wales. Scotland and Northern Ireland have their own rules.",
          "Premises that sell alcohol need a premises licence, and a **designated premises supervisor** (DPS), who must hold a personal licence. Every sale of alcohol must be made or authorised by a personal licence holder.",
          "Staff who serve drinks under that authority do not each need their own licence. Managers, supervisors and anyone who wants to run a bar or shop usually do.",
        ],
      },
      {
        id: "how-to-get-one",
        title: "How to get one",
        blocks: [
          {
            type: "ul",
            items: [
              "**Be 18 or over.**",
              "**Pass a licensing qualification**, such as the Level 2 Award for Personal Licence Holders (APLH). It is a one-day course with a short multiple-choice exam.",
              "**Get a basic criminal record check** (a basic DBS check).",
              "**Apply to the council where you live**, with your qualification certificate, the check, photos and the fee.",
            ],
          },
        ],
      },
      {
        id: "how-long",
        title: "How long it lasts",
        blocks: [
          "In England and Wales, a personal licence does not need renewing. You keep it unless a court or the council takes it away, for example after certain criminal convictions.",
          "Tell your council if you change your name or address.",
        ],
      },
      {
        id: "responsibilities",
        title: "Your responsibilities",
        blocks: [
          "As a personal licence holder, you are responsible for sales you make or authorise. In particular, it is an offence to:",
          {
            type: "ul",
            items: [
              "sell alcohol to anyone under 18",
              "sell alcohol to someone who is drunk",
              "sell alcohol outside the hours or conditions on the premises licence",
            ],
          },
          "Most venues use an age-check policy, such as Challenge 25, and train their staff to ask for ID. Convictions for certain offences can lead to your licence being suspended or taken away.",
        ],
      },
      {
        id: "changing-jobs",
        title: "Changing jobs",
        blocks: [
          "A personal licence belongs to you, not to the premises where you work. You keep it when you change jobs, and you can be named as the designated premises supervisor at a new venue.",
        ],
      },
      {
        id: "related-training",
        title: "Other training for licensed premises",
        blocks: [
          "If you serve food too, a Level 2 food hygiene certificate is a good next step. Supervisors and managers may need the Level 3 award in supervising food safety.",
        ],
      },
    ],
  },
];
