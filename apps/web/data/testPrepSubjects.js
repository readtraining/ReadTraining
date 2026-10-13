// Test prep SUBJECT pages (/test-prep/<slug>): one entry per subject, keyed by the hub slug (data/testPrep.js).
// PLACEHOLDER CONTENT: text, headings and test lists are taken from the reference site (Hurak) with the brand changed to
// ReadTraining. Replace with our own content later; the page template reads only this file.
//
// exam      the subject's exam numbers, the single source for every number shown: { questions, passMark (%), minutes }.
//           The lead and the test cards both read these, so they cannot disagree.
// lead      intro under the H1. Placeholders {questions}, {passMark}, {passCount}, {minutes} and {duration} are filled from `exam`.
// tests     one card per mock test: { slug, title, subtitle? } plus questions / passMark / minutes only where that paper differs.
// more      other subjects for "More Tests & Resources" (hub slugs).
// sections  the article: { id, heading, blocks: [{ type: "p" | "note" | "h3", text } | { type: "ul" | "ol", items } | { type: "table", rows }] }.
// faqs      optional { q, a } list: shown as the FAQ accordion and the FAQPage structured data.
// A subject without sections or FAQs simply shows none.
export const subjects = {
  "cscs-mock-test-for-managers-and-professionals": {
    exam: {
      questions: 50,
      passMark: 90,
      minutes: 45
    },
    lead: "The CSCS Mock Test for Managers and Professionals features {questions} questions and answers that mimic the real test. You can take it multiple times without any extra charges. Use this free mock test to get used to the format and structure of the actual test. This test covers more topics than the CITB Health, Safety and Environment Test for Operatives and Specialists.",
    mockHeading: "CSCS Mock Test for Managers and Professionals",
    tests: [
      {
        slug: "cscs-mock-test-for-managers-and-professionals",
        title: "CSCS Mock Test for Managers and Professionals",
        subtitle: "Test 1"
      }
    ],
    more: [],
    sections: [
      {
        id: "what-is-the-cscs-mock-test-for-managers-and-professionals",
        heading: "What is the CSCS Mock Test for Managers and Professionals?",
        blocks: [
          {
            type: "p",
            text: "The CITB Health, Safety and Environment (HS&E) Test for Managers and Professionals (MAP) is commonly referred to as the CSCS Mock Test for Managers and Professionals. In reality, there's no separate CSCS test; it's the CITB HS&E test."
          },
          {
            type: "p",
            text: "This mock test is here to help you prepare for the real exam. Each time you schedule this test with CITB, it costs £23.50. To increase your chances of passing, take this mock test and complement it with YouTube videos linked on this page. Review the study materials on this page as many times as you need to feel confident in your preparation. Stay tuned, as we'll also provide a free test-prep book for the CITB Health, Safety and Environment test for Managers and Professionals on this page."
          },
          {
            type: "p",
            text: "Quick tip: Bookmark this page so you can return later to download the free Test Prep book."
          },
          {
            type: "p",
            text: "This test is required to qualify for the Black or White CSCS Card. If your role on a construction site is managerial, you should take this test. Additionally, if you've already obtained a recognised qualification, you can work toward getting the relevant CSCS card. Since there are different types of these cards, it can be confusing to choose the right one. So, be sure to know which card you're aiming for or use the CSCS card finder to simplify the process."
          }
        ]
      },
      {
        id: "what-does-the-cscs-test-for-managers-and-professionals-cover",
        heading: "What does the CSCS Test for Managers and Professionals Cover?",
        blocks: [
          {
            type: "p",
            text: "The CITB Health, Safety and Environment test for Managers and Professionals goes further than the test CITB conducts for Operatives and Specialists. This test covers extra categories like demolition and highway works. It's also updated to reflect recent changes. CITB has expanded it to include sections on mental health, leadership, occupational health governance, new technologies, and legislative compliance, in addition to the core areas below:"
          },
          {
            type: "ul",
            items: [
              "Legal and management",
              "Health and welfare",
              "General safety",
              "High risk activities",
              "Environment",
              "Specialist activities"
            ]
          }
        ]
      },
      {
        id: "is-this-cscs-mock-test-the-same-as-the-real-test",
        heading: "Is this CSCS Mock Test the Same as the Real Test?",
        blocks: [
          {
            type: "p",
            text: "This CSCS mock test follows the same format as the real test conducted by CITB, featuring multiple-choice questions. To take it a step further, we've included videos where you'll have 20 seconds to choose your answer. This will help you practice staying composed even as the time limit approaches."
          }
        ]
      },
      {
        id: "what-is-the-highest-level-cscs-card",
        heading: "What is the Highest Level CSCS Card?",
        blocks: [
          {
            type: "p",
            text: "The highest level of CSCS cards is designed for managers and individuals who are members of CSCS-approved professional bodies. This category includes the CSCS Black and White Cards. You can also explore the following courses to work toward obtaining the CSCS Black Card:"
          },
          {
            type: "ol",
            items: [
              "Level 6 NVQ Diploma in Construction Site Management",
              "Level 6 NVQ Diploma in Construction Contracting Operations Management"
            ]
          }
        ]
      },
      {
        id: "what-is-the-revision-material-for-cscs-managers",
        heading: "What is the Revision Material for CSCS Managers?",
        blocks: [
          {
            type: "p",
            text: "The materials needed to become CSCS-endorsed managers include:"
          },
          {
            type: "p",
            text: "1. Take the free CSCS mock test for managers and professionals to assess your understanding of your role."
          },
          {
            type: "p",
            text: "2. Try video mock exams with a timer running at the bottom to test yourself."
          },
          {
            type: "p",
            text: "3. A free Test Prep book with the same questions as the actual CITB Health, Safety, and Environment test for Managers and Professionals (coming soon)."
          }
        ]
      },
      {
        id: "what-is-the-passing-score-for-the-citb-hs-and-e-test",
        heading: "What is the Passing Score for the CITB HS&E Test?",
        blocks: [
          {
            type: "p",
            text: "The passing score for the CITB HS&E test for MAP is 90%. There are 50 multiple-choice questions in total, and you need to get 45 of them right to pass."
          }
        ]
      },
      {
        id: "how-can-i-pass-my-cscs-test-on-the-first-attempt",
        heading: "How can I Pass my CSCS Test on the First Attempt?",
        blocks: [
          {
            type: "p",
            text: "Preparation is crucial to pass the test. Spend time learning from various resources. Focus on those subjects and reattempt all the questions in the Test Prep book. Then, take a pen and paper, start a video mock exam, and test your understanding. Finally, take this mock test. Doing all of this should help you pass the test easily."
          }
        ]
      },
      {
        id: "which-cscs-card-is-the-best",
        heading: "Which CSCS Card is the Best?",
        blocks: [
          {
            type: "p",
            text: "CSCS cards are suitable for different construction roles. Your best card depends on your qualifications, experience, and job on the site. For example, if you've been a manager on-site for years, aim for the CSCS Black Card. If you're new to construction and want to work as a laborer, the CSCS Green Card is a good choice. To find the right CSCS card for you, contact our support team or use the CSCS card finder."
          }
        ]
      },
      {
        id: "what-is-next-after-passing-the-cscs-test-for-managers-and-professionals",
        heading: "What is Next after Passing the CSCS Test for Managers and Professionals?",
        blocks: [
          {
            type: "p",
            text: "If you're in a managerial role and have a recognised qualification, apply for the CSCS Black/White Card. Check the eligibility criteria in our dedicated guides or call our team at 0333 344 1293, 8am to 6pm, Monday to Friday excluding bank holidays."
          }
        ]
      }
    ]
  },
  "cscs-mock-test": {
    exam: {
      questions: 50,
      passMark: 90,
      minutes: 45
    },
    lead: "Passing your CSCS Green Card exam in 2025 starts here. Our free mock tests include over 1,000 essential questions and answers to help you prepare with confidence.",
    mockHeading: "CITB HS&E test for operatives",
    tests: [
      {
        slug: "citb-hs-and-e-mock-test-1",
        title: "CITB HS&E test for operatives (Test 1)"
      },
      {
        slug: "citb-hs-and-e-mock-test-2",
        title: "CITB HS&E test for operatives (Test 2)"
      },
      {
        slug: "citb-hs-and-e-mock-test-3",
        title: "CITB HS&E test for operatives (Test 3)"
      },
      {
        slug: "citb-hs-and-e-mock-test-4",
        title: "CITB HS&E test for operatives (Test 4)"
      },
      {
        slug: "citb-hs-and-e-mock-test-5",
        title: "CITB HS&E test for operatives (Test 5)"
      },
      {
        slug: "citb-hs-and-e-mock-test-6",
        title: "CITB HS&E test for operatives (Test 6)"
      },
      {
        slug: "citb-hs-and-e-mock-test-7",
        title: "CITB HS&E test for operatives (Test 7)"
      },
      {
        slug: "citb-hs-and-e-mock-test-8",
        title: "CITB HS&E test for operatives (Test 8)"
      },
      {
        slug: "citb-hs-and-e-mock-test-9",
        title: "CITB HS&E test for operatives (Test 9)"
      },
      {
        slug: "citb-hs-and-e-mock-test-10",
        title: "CITB HS&E test for operatives (Test 10)"
      }
    ],
    more: [
      "sssts-mock-test",
      "smsts-mock-test",
      "cscs-mock-test-for-managers-and-professionals",
      "citb-mock-test-50-questions"
    ],
    sections: [
      {
        id: "what-is-the-cscs-test",
        heading: "What is the CSCS Test?",
        blocks: [
          {
            type: "p",
            text: "The CSCS Test and CITB Health, Safety, and Environment (HS&E) Test are used interchangeably. You need to take this test to apply for a CSCS card."
          },
          {
            type: "p",
            text: "No matter which card you're applying for, be it the CSCS Green Card, Blue Card,Gold Card, Black Card, or White Card, passing the CITB HS&E test is a requirement."
          },
          {
            type: "p",
            text: "We provide free resources, including a handbook with 400 CSCS test questions and answers. It covers the same topics as the CITB test, helping you prepare before you schedule the actual test."
          }
        ]
      },
      {
        id: "how-to-check-the-cscs-mock-test-results",
        heading: "How to Check the CSCS Mock Test Results?",
        blocks: [
          {
            type: "p",
            text: "At the end of the mock test, a page displaying your results will appear. To pass this test, you need to score 32 out of 40."
          },
          {
            type: "p",
            text: "Check out our dedicated test prep section on our site for more practice exams."
          }
        ]
      },
      {
        id: "which-cscs-test-should-you-sit",
        heading: "Which CSCS Test Should You Sit?",
        blocks: [
          {
            type: "p",
            text: "There are three types of CITB HS&E or CSCS tests:"
          },
          {
            type: "p",
            text: "1. CSCS Test for Operatives 2. CSCS Test for Specialists 3. CSCS Test for Managers and Professionals"
          },
          {
            type: "p",
            text: "Before you start studying for the appropriate CSCS test, you should determine which card you are applying for. For example, if you're an entry-level worker on a construction site, you'll need the CSCS Green Card to join the CSCS-certified workforce. Conversely, aim for the CSCS Black Card if you hold a managerial role."
          },
          {
            type: "p",
            text: "Once you've chosen the right CSCS card for your role, you should find the relevant CSCS test. For instance, to obtain a CSCS Green Card, you must pass the CITB HS&E Test for Operatives. To figure out which test is suitable, refer to the dedicated guide on the CITB test."
          },
          {
            type: "p",
            text: "If you want personalised guidance on which test to take for your desired CSCS Card, give us a call at 0333 344 1293. Our experienced team will assist you and help you save time."
          }
        ]
      },
      {
        id: "what-is-cscs",
        heading: "What is CSCS?",
        blocks: [
          {
            type: "p",
            text: "CSCS (Construction Skills Certification Scheme) issues cards to construction workers in the UK and takes on the responsibility of upholding health and safety standards on construction sites. Site owners prefer workers with a grasp of safety principles since they can help ensure the safety of themselves and those around them. Also, you must be clear about the different types of CSCS cards and know which one goes with your background and experience. While these cards are not legally required, many employers still prefer to hire individuals who possess them."
          }
        ]
      },
      {
        id: "how-is-the-test-structured",
        heading: "How is the Test Structured?",
        blocks: [
          {
            type: "p",
            text: "The CSCS test lasts for 45 minutes and includes multiple-choice and behavioural questions. Its purpose is to assess how you respond to risky situations. By attempting this mock test, you can get an idea of what to expect in the CITB HS&E test."
          },
          {
            type: "p",
            text: "It's essential to remember that some questions may require multiple answers. Take your time to read a statement and carefully consider your response before submitting an answer."
          }
        ]
      },
      {
        id: "topics-covered-in-the-test",
        heading: "Topics Covered in the Test",
        blocks: [
          {
            type: "p",
            text: "- Operatives"
          },
          {
            type: "ol",
            items: [
              "Working environment",
              "Occupational health",
              "Safety",
              "High risk activities",
              "Specialist:"
            ]
          },
          {
            type: "p",
            text: "Here’s a free video CSCS Mock Test for Operatives."
          },
          {
            type: "p",
            text: "- Specialists"
          },
          {
            type: "p",
            text: "Topics on top of the content covered in the Operatives test:"
          },
          {
            type: "ol",
            items: [
              "Supervisory (SUP)",
              "Demolition (DEM)",
              "Plumbing (JIB) (PLUM)",
              "Highway Works (HIW)",
              "Specialist Work at Height (WAH)",
              "Lifts and Escalators (LAEE)",
              "Tunnelling (TUNN)",
              "HVACR - Heating and Plumbing Services (HAPS)",
              "HVACR - Pipefitting and Welding (PFW)",
              "HVACR - Ductwork (DUCT)",
              "HVACR - Refrigeration and Air Conditioning (RAAC)",
              "HVACE - Services and Facilities Maintenance (SAF)"
            ]
          },
          {
            type: "p",
            text: "- Managers and Professionals"
          },
          {
            type: "ul",
            items: [
              "Legal and management",
              "Occupational health, wellbeing and welfare",
              "General safety",
              "High risk activities",
              "Environment",
              "Specialist activities",
              "Specialist activities will cover questions on Demolition and Highway works"
            ]
          }
        ]
      },
      {
        id: "what-types-of-questions-should-you-expect",
        heading: "What Types of Questions Should You Expect?",
        blocks: [
          {
            type: "p",
            text: "We’ve discussed above that you’ll submit answers to the multiple choice questions in the CSCS test. But there are other types that we’d like you to make yourself familiar with. These include drag and drop, hotspot, hot area, reasoned adjustment and option selection questions."
          },
          {
            type: "p",
            text: "1. Drag and Drop"
          },
          {
            type: "p",
            text: "2. Hotspot"
          },
          {
            type: "p",
            text: "3. Hot Area"
          },
          {
            type: "p",
            text: "4. Reasoned Adjustment"
          },
          {
            type: "p",
            text: "5. Option Selection"
          }
        ]
      },
      {
        id: "what-are-the-passing-marks-for-the-cscs-test",
        heading: "What are the Passing Marks for the CSCS Test?",
        blocks: [
          {
            type: "p",
            text: "To pass the test, 45 out of 50 questions must be correct, or you must score at least 90% to pass the exam."
          },
          {
            type: "p",
            text: "You can book the CITB Health, Safety and Environment test here."
          }
        ]
      },
      {
        id: "how-long-is-the-cscs-test-valid-for",
        heading: "How Long is the CSCS Test Valid for?",
        blocks: [
          {
            type: "p",
            text: "The CSCS Test is valid for 2 years. To know more about the validity of CSCS cards, you should check this post out."
          }
        ]
      },
      {
        id: "cscs-test-topics",
        heading: "CSCS Test Topics",
        blocks: [
          {
            type: "ul",
            items: [
              "General Responsibilities",
              "Accident Reporting and Recording",
              "Health and Welfare",
              "First Aid and Emergency Procedures",
              "Personal Protective Equipment",
              "Dust and Fumes – Respiratory Hazards",
              "Noise and Vibration",
              "Hazardous Substances",
              "Manual Handling",
              "Safety Signs",
              "Fire Prevention and Control",
              "Electrical Safety, Tools and Equipment",
              "Site Transport Safety and Lifting Procedures",
              "Working at Height",
              "Excavations and Confined Spaces",
              "Environmental Awareness and Waste Control"
            ]
          }
        ]
      },
      {
        id: "what-do-you-need-to-bring-to-sit-the-cscs-test",
        heading: "What Do You Need to Bring to Sit the CSCS Test?",
        blocks: [
          {
            type: "p",
            text: "You must bring an identification document with you bearing your photograph and signature. This could be a passport or driving licence."
          }
        ]
      },
      {
        id: "what-next-after-i-pass-the-cscs-test",
        heading: "What Next After I Pass the CSCS Test?",
        blocks: [
          {
            type: "p",
            text: "The CITB HS&E Test is mandatory for you to get a CSCS Card. You also need a certificate from an approved training provider of an appropriate qualification to be eligible for the CSCS Green, Blue, Black or White Card. You can enrol on the following courses with us and work towards your desired card."
          },
          {
            type: "ul",
            items: [
              "CSCS Blue Card"
            ]
          },
          {
            type: "p",
            text: "NVQ Level 2 Diploma in Plastering Level 2 NVQ Diploma in Roofing Occupations (Construction) Level 2 Diploma in Decorative Finishing and Industrial Paint Level 2 NVQ Certificate in Wall and Floor Tiling"
          },
          {
            type: "ul",
            items: [
              "CSCS Gold Card"
            ]
          },
          {
            type: "p",
            text: "Level 4 NVQ Diploma in Construction Site Supervision (Building and Civil Engineering) Level 3 NVQ Certificate in Wall and Floor Tiling NVQ Level 3 Diploma in Roofing Occupations Level 3 NVQ Diploma in Plastering"
          },
          {
            type: "ul",
            items: [
              "CSCS Black Card"
            ]
          },
          {
            type: "p",
            text: "Level 6 NVQ Diploma in Construction Site Management Level 6 NVQ Diploma in Construction Contracting Operations Management"
          }
        ]
      }
    ]
  },
  "citb-mock-test-50-questions": {
    exam: {
      questions: 50,
      passMark: 90,
      minutes: 45
    },
    lead: "This Free CITB Mock Test includes {questions} questions and answers. To pass, you must score at least {passMark}%, meaning {passCount} out of {questions} questions must be correct. This test helps you gauge your knowledge of health and safety practices on a construction site.",
    mockHeading: "CITB Mock Test",
    tests: [
      {
        slug: "citb-hs-and-e-mock-test-1",
        title: "CITB HS&E test for operatives (Test 1)"
      },
      {
        slug: "citb-hs-and-e-mock-test-2",
        title: "CITB HS&E test for operatives (Test 2)"
      },
      {
        slug: "citb-hs-and-e-mock-test-3",
        title: "CITB HS&E test for operatives (Test 3)"
      },
      {
        slug: "citb-hs-and-e-mock-test-4",
        title: "CITB HS&E test for operatives (Test 4)"
      },
      {
        slug: "citb-hs-and-e-mock-test-5",
        title: "CITB HS&E test for operatives (Test 5)"
      },
      {
        slug: "citb-hs-and-e-mock-test-6",
        title: "CITB HS&E test for operatives (Test 6)"
      },
      {
        slug: "citb-hs-and-e-mock-test-7",
        title: "CITB HS&E test for operatives (Test 7)"
      },
      {
        slug: "citb-hs-and-e-mock-test-8",
        title: "CITB HS&E test for operatives (Test 8)"
      },
      {
        slug: "citb-hs-and-e-mock-test-9",
        title: "CITB HS&E test for operatives (Test 9)"
      },
      {
        slug: "citb-hs-and-e-mock-test-10",
        title: "CITB HS&E test for operatives (Test 10)"
      }
    ],
    more: [
      "sssts-mock-test",
      "smsts-mock-test",
      "cscs-mock-test-for-managers-and-professionals",
      "cscs-mock-test"
    ],
    sections: [
      {
        id: "who-is-the-citb-mock-test-for",
        heading: "Who is the CITB Mock Test for?",
        blocks: [
          {
            type: "p",
            text: "The CITB Mock test is for entry level workers, specialists, and managers in construction who want to get a CSCS card. It's a practice test for self evaluation. There are three types of CITB HS&E mock tests: Operatives, Specialists & Managers and Professionals."
          },
          {
            type: "p",
            text: "The CITB Health, Safety, and Environment test assesses if you can work safely on a construction site. It features 50 multiple choice questions that determine if you have the skills to keep yourself and your coworkers safe."
          },
          {
            type: "p",
            text: "The CITB test is also known as the CSCS test because it's a crucial step to apply for CSCS cards."
          }
        ]
      },
      {
        id: "citb-health-safety-and-environment-test-revision-material",
        heading: "CITB Health, Safety, and Environment Test – Revision Material",
        blocks: [
          {
            type: "p",
            text: "While you can retake the CITB test 24 hours after your first attempt, it's better to prepare well beforehand and avoid retaking it. Each attempt costs £23.50. We offer a free handbook with questions and answers identical to the actual CITB test to help you prepare. We also have videos available for you to watch and boost your confidence in your preparation."
          }
        ]
      },
      {
        id: "how-to-pass-your-test-on-the-first-try",
        heading: "How to Pass Your Test on the First Try?",
        blocks: [
          {
            type: "p",
            text: "Passing your test on the first attempt requires solid preparation and a good plan. You can increase your chances of success by practising CITB Mock tests (Operatives, Specialists, and Managers & Professionals). You can also watch our mock test videos on YouTube. During the videos, there will be a 20-second pause after each question so that you can write down your answer. Once the time is up, the correct answers will be highlighted in green. You can find the videos for the relevant CITB mock tests below:"
          }
        ]
      },
      {
        id: "what-do-i-need-for-the-citb-test",
        heading: "What do I Need for the CITB Test?",
        blocks: [
          {
            type: "p",
            text: "To book the CITB test, you'll need a valid identification document with your photo and signature. If you're in the UK, you can use your driver's licence, or if you're from another country, a valid passport works. If you don't have either of these, you can still take the CITB test by filling out a Waiver Form. This form must be signed by two UK government officials who can vouch for your identity."
          }
        ]
      },
      {
        id: "which-citb-test-should-i-take",
        heading: "Which CITB Test Should I Take?",
        blocks: [
          {
            type: "p",
            text: "There are three types of CITB Health, Safety, and Environment (HS&E) tests, each for a different group:"
          },
          {
            type: "p",
            text: "1. CITB HS&E Test for Operatives 2. CITB HS&E Test for Specialists 3. CITB HS&E for Managers and Professionals"
          },
          {
            type: "p",
            text: "If you're a labourer or new to the construction industry, the CSCS Mock Test for Operatives is the one for you. However, it's a good idea first to determine which CSCS card you need, which will help you choose the right CITB test. For example, if you qualify for the CSCS Green Card, the Operatives test is the one you should take. On the other hand, if you have a managerial role overseeing construction site operations and aim for the CSCS Black Card, then the CITB Health, Safety, and Environment Test for Managers and Professionals is the one for you."
          },
          {
            type: "p",
            text: "You can also reach us at 0333 344 1293, Monday to Friday from 8 am to 6 pm, excluding bank holidays, for further assistance."
          }
        ]
      },
      {
        id: "citb-test-validity",
        heading: "CITB Test Validity",
        blocks: [
          {
            type: "p",
            text: "The CITB Health, Safety, and Environment test remains valid for two years. People often mix up its validity with CSCS cards, but remember, when you apply for a card initially or renew it, you must have passed the CITB test within the last two years."
          }
        ]
      },
      {
        id: "citb-test-cost",
        heading: "CITB Test Cost",
        blocks: [
          {
            type: "p",
            text: "To book the CITB test, the cost is £23.50. If you use a third party to apply on your behalf, the fee may be slightly higher. At ReadTraining, we offer this service. You can contact our team to book the CITB test for you. We may get in touch if we need more information."
          }
        ]
      },
      {
        id: "how-to-get-a-cscs-card-after-passing-the-test",
        heading: "How to Get a CSCS Card After Passing the Test?",
        blocks: [
          {
            type: "p",
            text: "Getting a CSCS card involves three steps:"
          },
          {
            type: "p",
            text: "1. Earn a recognised qualification."
          },
          {
            type: "p",
            text: "2. Pass the safety assessment. The CITB Health, Safety, and Environment test is one of the accepted tests. You need to score at least 90% to pass. Our test prep section can help you assess yourself and work on areas where you can improve."
          },
          {
            type: "p",
            text: "3. Apply for the card. You can do this online, and we recommend the online application because it's processed faster, typically taking 3-5 working days. Applying over the phone might take up to 10 days."
          }
        ]
      },
      {
        id: "does-citb-offer-courses",
        heading: "Does CITB Offer Courses?",
        blocks: [
          {
            type: "p",
            text: "CITB is committed to skills development and improving safety standards at construction sites. They provide a range of courses known as the Site Safety Plus (SSP) courses. Employers highly value these courses because they confirm your understanding of important safety practices for construction sites."
          },
          {
            type: "p",
            text: "Find the list of the courses below:"
          },
          {
            type: "ol",
            items: [
              "Site Supervisor Safety Training Scheme (SSSTS)",
              "Site Management Safety Training Scheme (SMSTS)",
              "Health and Safety Awareness (HSA)",
              "Site Supervisor Safety Training Scheme Refresher (SSSTS-R)",
              "Site Management Safety Training Scheme Refresher (SMSTS-R)"
            ]
          }
        ]
      }
    ]
  },
  "cscs-green-card-mock-test": {
    exam: {
      questions: 40,
      passMark: 80,
      minutes: 60
    },
    lead: "The CSCS Green Card mock test consists of {questions} multiple choice questions covering safety practices, accident prevention and the use of protective equipment. To pass this test, {passCount} out of {questions} questions must be correct. At the end of the test, a page will display your score and the incorrect answers.",
    mockHeading: "2024 CSCS Green Card Mock Exam Test",
    tests: [
      {
        slug: "cscs-green-card-mock-test-1",
        title: "CSCS Green Mock (Test 1)"
      },
      {
        slug: "cscs-green-card-mock-test-2",
        title: "CSCS Green Mock (Test 2)"
      },
      {
        slug: "cscs-green-card-mock-test-3",
        title: "CSCS Green Mock (Test 3)"
      },
      {
        slug: "cscs-green-card-mock-test-4",
        title: "CSCS Green Mock (Test 4)"
      },
      {
        slug: "cscs-green-card-mock-test-5",
        title: "CSCS Green Mock (Test 5)"
      },
      {
        slug: "cscs-green-card-test-6",
        title: "CSCS Green Mock (Test 6)"
      },
      {
        slug: "cscs-green-card-mock-test-7",
        title: "CSCS Green Mock (Test 7)"
      },
      {
        slug: "cscs-green-card-mock-test-8",
        title: "CSCS Green Mock (Test 8)"
      },
      {
        slug: "cscs-green-card-mock-test-9",
        title: "CSCS Green Mock (Test 9)"
      },
      {
        slug: "cscs-green-card-mock-test-10",
        title: "CSCS Green Mock (Test 10)"
      }
    ],
    more: [],
    sections: [
      {
        id: "cscs-green-card-mock-test",
        heading: "CSCS Green Card Mock Test",
        blocks: [
          {
            type: "p",
            text: "The CSCS Green Card Mock Test is for entry level workers or those wanting to join the construction industry. This is your first step to start a career in construction."
          },
          {
            type: "note",
            text: "This mock test is for the RQF Level 1 Award in Health and Safety in a Construction Environment (L1HSCE). It's one of the accepted qualifications you need to get a CSCS Green Card. The passing requirements depend on the training provider. At ReadTraining, we give you a Highfield certificate when you finish the L1HSCE course with us. This mock exam mimics the actual test."
          },
          {
            type: "p",
            text: "Don't mix up this test with the CITB Health, Safety, and Environment test. If you're looking for CSCS Mock Tests, please visit this page."
          },
          {
            type: "p",
            text: "The best part is you can attempt this test as many times as you like – there’s no limit. We’ve got a free handbook for you as well! Supplement your preparation with the free CSCS Green Card handbook and test yourself with this mock test. Give this a try, pass on to the next stage, and apply for your CSCS Labourer Card."
          }
        ]
      },
      {
        id: "what-is-a-cscs-green-card",
        heading: "What is a CSCS Green Card?",
        blocks: [
          {
            type: "p",
            text: "CSCS stands for Construction Skills Certification Scheme. The core objective of this organisation is to certify individuals in the UK for their understanding of health and safety principles. CSCS issues cards of different colours to indicate the level of qualification or training a candidate has. The CSCS Green Card is one of the types primarily for entry-level construction workers."
          },
          {
            type: "p",
            text: "To apply for the CSCS Green Card, you must meet the requirements specified by CSCS — it includes appropriate training from an approved training provider, a passed CITB Health, Safety and Environment (HS&E) test for Operatives and £36 to process your application."
          }
        ]
      },
      {
        id: "what-is-the-cscs-test",
        heading: "What is the CSCS Test?",
        blocks: [
          {
            type: "p",
            text: "The CITB Health, Safety and Environment Test is also called the CSCS test. To get any CSCS card, you must sit this test. Since there are three types of this safety test, that’s where you need to be very careful."
          },
          {
            type: "p",
            text: "For the CSCS Green Card, you need to book the CITB HS&E Test for Operatives. It consists of 50 multiple choice questions, and you must score 90%, at least (45/50) in 45 minutes to pass the test."
          },
          {
            type: "p",
            text: "No idea where to start your preparation from? Download this free handbook on CSCS Mock Test for Operatives. It contains 400 questions and answers that mimic the real CITB test. Once you’re confident, feel free to book the test yourself or have us apply on your behalf."
          }
        ]
      },
      {
        id: "how-long-are-cscs-green-cards-valid",
        heading: "How Long are CSCS Green Cards Valid?",
        blocks: [
          {
            type: "p",
            text: "The CSCS Green Card is valid for 5 years. To continue working on a construction site, you need to file a renewal application for your card within a 6-month window before or after the expiry date."
          }
        ]
      },
      {
        id: "how-to-get-a-cscs-green-card",
        heading: "How to Get a CSCS Green Card?",
        blocks: [
          {
            type: "p",
            text: "To apply for the CSCS Green Card, any of the following qualifications works:"
          },
          {
            type: "p",
            text: "1. An RQF Level 1 Award in Health and Safety in a Construction Environment"
          },
          {
            type: "p",
            text: "(A lifetime qualification – simply pass it and use the certification anywhere, any time. Also, don’t confuse it with the validity of a CSCS Green Card, which expires after 5 years.)"
          },
          {
            type: "p",
            text: "2. An SCQF Level 5 REHIS Elementary Health and Safety Certificate"
          },
          {
            type: "p",
            text: "3. The NOCN/CSkills Awards Construction Health and Safety (F/618/0738) unit"
          },
          {
            type: "p",
            text: "You can enrol on a CSCS-approved alternative qualification. For instance, you can sign up for the CITB Health and Safety Awareness Course. This course stays valid for 5 years. After it expires, you must re-do the course and apply for the CSCS Green Card to access a construction site. You can not renew a CSCS Green Card, so you need to apply for it again."
          },
          {
            type: "p",
            text: "After you receive certificates for your training and the CITB test, apply for the CSCS Green Card."
          }
        ]
      },
      {
        id: "how-much-is-a-cscs-green-card-test",
        heading: "How Much is a CSCS Green Card Test?",
        blocks: [
          {
            type: "p",
            text: "The CSCS Green Card Training (RQF Level 1 Award in Health and Safety in a Construction Environment) starts from £79.99 (VAT inc), and the safety test additionally costs £23.50 – this makes it £102.50 combined."
          },
          {
            type: "p",
            text: "To file an application, you need to pay £36 to CSCS. So, it can take anywhere from £100 - £150 to get yourself a CSCS Green Card in the UK."
          }
        ]
      },
      {
        id: "free-cscs-green-card-revision-book",
        heading: "Free CSCS Green Card Revision Book",
        blocks: [
          {
            type: "p",
            text: "This free CSCS Green Card Handbook covers health & welfare, manual handling, general safety, fire safety, work at height, mobile plants and vehicles. You can download this book and prepare for the test."
          },
          {
            type: "p",
            text: "For the free CITB Mock test, please check out this page and attempt the test to make yourself familiar with the format."
          }
        ]
      },
      {
        id: "relevant-courses-for-other-cscs-cards",
        heading: "Relevant Courses for other CSCS cards",
        blocks: [
          {
            type: "ul",
            items: [
              "CSCS Blue Card"
            ]
          },
          {
            type: "p",
            text: "NVQ Level 2 Diploma in Plastering Level 2 NVQ Diploma in Roofing Occupations (Construction) Level 2 Diploma in Decorative Finishing and Industrial Paint Level 2 NVQ Certificate in Wall and Floor Tiling"
          },
          {
            type: "ul",
            items: [
              "CSCS Gold Card"
            ]
          },
          {
            type: "p",
            text: "Level 4 NVQ Diploma in Construction Site Supervision (Building and Civil Engineering) Level 3 NVQ Certificate in Wall and Floor Tiling NVQ Level 3 Diploma in Roofing Occupations Level 3 NVQ Diploma in Plastering"
          },
          {
            type: "ul",
            items: [
              "CSCS Black Card"
            ]
          },
          {
            type: "p",
            text: "Level 6 NVQ Diploma in Construction Site Management Level 6 NVQ Diploma in Construction Contracting Operations Management"
          }
        ]
      }
    ]
  },
  "personal-licence-mock-exam": {
    exam: {
      questions: 40,
      passMark: 70,
      minutes: 60
    },
    lead: "This Free Personal Licence Mock exam is a {questions} MCQ paper, created by our experienced instructors. It is aimed at anyone who is taking the APLH personal licence course or would like to have a feel for the exam.",
    mockHeading: "2026 APLH Mock Test",
    tests: [
      {
        slug: "personal-alcohol-licence-test",
        title: "Alcohol Personal Licence"
      }
    ],
    more: [],
    sections: [
      {
        id: "personal-licence-mock-exam-2024",
        heading: "Personal Licence Mock Exam 2024",
        blocks: [
          {
            type: "p",
            text: "On this page, you will find everything you need to prepare for the APLH ( Award for Personal Licence Holders) exam."
          },
          {
            type: "p",
            text: "The Personal licence exam is a mandatory requirement for anyone doing the course. This APLH Personal licence mock exam is designed to help you prepare for your actual exam by providing you with a realistic and comprehensive experience. This mock exam includes 40 questions, which are carefully selected to mimic the actual exam questions."
          },
          {
            type: "p",
            text: "When you take the mock exam, a timer will start to help you manage your time effectively, just like the actual exam. You will also receive the answers after submitting your exam, so you can learn from your mistakes and improve your knowledge of any specific topics or subjects."
          },
          {
            type: "p",
            text: "The passing marks for this Mock Test is: 28 / 40"
          }
        ]
      }
    ]
  },
  "fire-marshal-test": {
    exam: {
      questions: 20,
      passMark: 70,
      minutes: 40
    },
    lead: "The Fire Banksman (Marshal) Mock Exam consists of {questions} multiple-choice questions to practice. You must answer {passCount} questions correctly to pass this test. At the end of the test, a page will display your score and the incorrect answers.",
    mockHeading: "Fire Marshal Mock Exam 2024",
    tests: [
      {
        slug: "firemarshal-mock-test",
        title: "Fire Marshal Mock Test"
      }
    ],
    more: [],
    sections: [
      {
        id: "fire-marshal-fire-warden-mock-test-2025",
        heading: "Fire Marshal (Fire Warden) Mock Test 2025",
        blocks: [
          {
            type: "p",
            text: "The Fire Marshal Mock test assesses your understanding of fire safety principles and fire emergencies. This free mock exam simulates the format and pattern of the actual examinations. It evaluates skills required to manage fire safety services and to meet legal requirements under UK workplace regulations."
          },
          {
            type: "p",
            text: "The Fire Marshal mock exam is based on the core content of the Fire Marshal and Warden Course. Both the course and the mock test are valuable for those preparing to become certified fire marshals or wardens and safeguard workplaces against fire hazards."
          }
        ]
      },
      {
        id: "key-areas-covered-in-the-fire-banksman-mock-test-2024",
        heading: "Key Areas Covered in the Fire Banksman Mock Test 2024",
        blocks: [
          {
            type: "p",
            text: "The fire marshal training questions evaluates the following areas:"
          },
          {
            type: "ul",
            items: [
              "Duties and responsibilities of fire wardens/marshals",
              "Identification of common fire hazards and potential fire risks",
              "Safe evacuation procedures and firefighting tactics",
              "Recognition and maintenance of fire safety equipment",
              "Principles of fire prevention",
              "Proper use of fire equipment and personal protective equipment (PPE)",
              "Correct operation of different types of fire extinguishers",
              "Understanding of Fire Safety legislation (Fire Safety Order 2005)",
              "Use this mock test to review and reinforce your knowledge, ensuring you're well-prepared for real-life fire safety challenges and compliance with UK regulations."
            ]
          }
        ]
      }
    ]
  },
  "sia-mock-test": {
    exam: {},
    lead: "Revise for your SIA Door Supervisor exams by taking our SIA Licence Training mock exams.",
    mockHeading: "SIA Door Supervisor Mock Exam",
    tests: [
      {
        slug: "wispi-1",
        title: "Unit 1 Principles of working in the private security industry (Test 1)",
        subtitle: "Working in the private security industry (Test 1)",
        passMark: 70,
        minutes: 110
      },
      {
        slug: "wispi-2",
        title: "Unit 1 Principles of working in the private security industry (Test 2)",
        subtitle: "Working in the private security industry (Test 2)",
        passMark: 70,
        minutes: 110
      },
      {
        slug: "wispi-3",
        title: "Unit 1 Principles of working in the private security industry (Test 3)",
        subtitle: "Working in the private security industry (Test 3)",
        passMark: 70,
        minutes: 110
      },
      {
        slug: "wispi-4",
        title: "Unit 1 Principles of working in the private security industry (Test 4)",
        subtitle: "Working in the private security industry (Test 4)",
        passMark: 70,
        minutes: 110
      },
      {
        slug: "wispi-5",
        title: "Unit 1 Principles of working in the private security industry (Test 5)",
        subtitle: "Working in the private security industry (Test 5)",
        passMark: 70,
        minutes: 110
      },
      {
        slug: "wispi-11",
        title: "Unit 2 Principles of working as a door supervisor in the private security industry (Test 1)",
        subtitle: "Working as a door supervisor (Test 1)",
        passMark: 70,
        minutes: 30
      },
      {
        slug: "wispi-12",
        title: "Unit 2 Principles of working as a door supervisor in the private security industry (Test 2)",
        subtitle: "Working as a door supervisor (Test 2)",
        passMark: 70,
        minutes: 30
      },
      {
        slug: "wispi-8",
        title: "Unit 2 Principles of working as a door supervisor in the private security industry (Test 3)",
        subtitle: "Working as a door supervisor (Test 3)",
        passMark: 70,
        minutes: 75
      },
      {
        slug: "wispi-9",
        title: "Unit 2 Principles of working as a door supervisor in the private security industry (Test 4)",
        subtitle: "Working as a door supervisor (Test 4)",
        passMark: 70,
        minutes: 75
      },
      {
        slug: "wispi-10",
        title: "Unit 2 Principles of working as a door supervisor in the private security industry (Test 5)",
        subtitle: "Working as a door supervisor (Test 5)",
        passMark: 70,
        minutes: 75
      },
      {
        slug: "wispi-6",
        title: "Unit 3 Principles of Conflict Management in the private security industry (Test 1)",
        subtitle: "Working as a door supervisor (Test 1)",
        passMark: 70,
        minutes: 75
      },
      {
        slug: "wispi-7",
        title: "Unit 3 Principles of Conflict Management in the private security industry (Test 2)",
        subtitle: "Working as a door supervisor (Test 2)",
        passMark: 70,
        minutes: 75
      },
      {
        slug: "wispi-13",
        title: "Unit 3 Principles of Conflict Management in the private security industry (Test 3)",
        subtitle: "Working as a door supervisor (Test 3)",
        passMark: 70,
        minutes: 30
      },
      {
        slug: "wispi-14",
        title: "Unit 3 Principles of Conflict Management in the private security industry (Test 4)",
        subtitle: "Working as a door supervisor (Test 4)",
        passMark: 70,
        minutes: 30
      },
      {
        slug: "wispi-15",
        title: "Unit 3 Principles of Conflict Management in the private security industry (Test 5)",
        subtitle: "Working as a door supervisor (Test 5)",
        passMark: 70,
        minutes: 30
      }
    ],
    more: [
      "sia-top-up-mock-tests"
    ],
    sections: [
      {
        id: "sia-licence-training-mock-exams-2026",
        heading: "SIA Licence Training Mock Exams 2026",
        blocks: [
          {
            type: "p",
            text: "This page offers everything you'll need to prepare effectively for your SIA (Security Industry Authority) Door Supervisor exams."
          },
          {
            type: "p",
            text: "Completing the SIA Door Supervisor course, followed by the SIA Door Supervisor exams, is compulsory for those pursuing the SIA Door Supervisor licence. With this licence, individuals gain the opportunity to work in retail security, corporate security, and event security, covering various security scenarios in the UK."
          },
          {
            type: "p",
            text: "At the end of the six-day Door Supervisor course, individuals must pass four multiple-choice question papers to apply for their SIA Door Supervisor licence. Examination details are provided in the image below."
          },
          {
            type: "table",
            rows: [
              [
                "Unit",
                "Name",
                "Pass mark",
                "Duration"
              ],
              [
                "1",
                "Principles of working in the private security industry",
                "51/72",
                "110 minutes"
              ],
              [
                "2",
                "Principles of working as a door supervisor in the private security industry",
                "35/50",
                "75 minutes"
              ],
              [
                "3",
                "Application of conflict management in the private security industry",
                "14/20",
                "30 minutes"
              ],
              [
                "4",
                "Application of physical intervention skills in the private security industry",
                "24/30",
                "45 minutes"
              ]
            ]
          },
          {
            type: "p",
            text: "We have developed 15 mock exams for the SIA Door Supervisor course, offering valuable practice opportunities. These Door Supervisor mock tests are designed to help you prepare for your actual exam by providing a realistic and comprehensive practice experience."
          },
          {
            type: "p",
            text: "In addition to our mock exams, we also offer a range of study materials, including online courses, practice quizzes, and study guides, all designed to help you prepare for the SIA Licence Training exams. Our materials are created by experts in the field, and they are regularly updated to ensure that they reflect the latest changes in the SIA regulations."
          }
        ]
      }
    ]
  },
  "smsts-mock-test": {
    exam: {
      questions: 20,
      passMark: 80,
      minutes: 30
    },
    lead: "The SMSTS mock test consists of {questions} multiple choice questions. You will have {minutes} minutes to complete the test. The pass mark for the SMSTS test is {passMark}%. To pass the exam, you must answer {passCount} questions correctly out of {questions}.",
    mockHeading: "SMSTS Mock Test",
    tests: [
      {
        slug: "smsts-test-1",
        title: "SMSTS (Test 1)"
      },
      {
        slug: "smsts-test-2",
        title: "SMSTS (Test 2)"
      },
      {
        slug: "smsts-test-3",
        title: "SMSTS (Test 3)"
      },
      {
        slug: "smsts-test-4",
        title: "SMSTS (Test 4)"
      },
      {
        slug: "smsts-test-5",
        title: "SMSTS (Test 5)"
      }
    ],
    more: [
      "sssts-mock-test",
      "cscs-mock-test-for-managers-and-professionals",
      "citb-mock-test-50-questions",
      "cscs-mock-test"
    ],
    sections: [
      {
        id: "smsts-site-management-safety-training-scheme-mock-test",
        heading: "SMSTS (Site Management Safety Training Scheme) Mock Test",
        blocks: [
          {
            type: "p",
            text: "Our SMSTS mock tests are designed for those who have booked or are considering booking the CITB SMSTS Course or the CITB SMSTS Refresher Course."
          },
          {
            type: "p",
            text: "Created by experienced instructors, these free tests help you prepare for the real exam by assessing your knowledge of key topics such as legal responsibilities, legislation, communication strategies, industry guidance, and safe practices."
          }
        ]
      },
      {
        id: "site-management",
        heading: "Site Management",
        blocks: [
          {
            type: "p",
            text: "Site management is a senior role that involves multiple duties on construction sites, mainly focused on supervising and overseeing the project's direction, liaising with the client, selecting tools and materials, making safety inspections, checking and preparing site reports, assessing and minimising risk, and more."
          }
        ]
      },
      {
        id: "what-is-the-smsts-test",
        heading: "What is the SMSTS Test?",
        blocks: [
          {
            type: "p",
            text: "The SMSTS exam is one of your course assessments. You must pass this 30-minute written examination at the end of the SMSTS course. There are 25 questions in the SMSTS test, and 20 of these questions are MCQs. You will need to get at least 80% marks. Other than MCQs, there are 5 long questions which must be answered correctly."
          },
          {
            type: "p",
            text: "After passing the SMSTS test, you’ll get an SMSTS certificate."
          }
        ]
      },
      {
        id: "how-much-does-the-smsts-course-cost",
        heading: "How Much Does the SMSTS Course Cost?",
        blocks: [
          {
            type: "p",
            text: "The cost of a CITB Site Manager Safety Training Scheme (SMSTS) course offered by ReadTraining Learning is £450, including VAT."
          }
        ]
      },
      {
        id: "what-is-the-smsts-certificate",
        heading: "What is the SMSTS Certificate?",
        blocks: [
          {
            type: "p",
            text: "Upon passing your SMSTS course, you’ll get your SMSTS certificate. The SMSTS certificate is officially known as a Site Safety Plus Certificate. The Site Safety Plus Certificate hold great value when applying for jobs in the construction industry."
          },
          {
            type: "p",
            text: "Once you successfully pass the SMSTS course, you will receive your SMSTS certificate within 4 weeks. Your SMSTS certificate lasts 5 years, after which you must take the SMSTS Refresher Course."
          }
        ]
      },
      {
        id: "how-much-does-the-smsts-test-cost",
        heading: "How Much Does the SMSTS Test Cost?",
        blocks: [
          {
            type: "p",
            text: "There is no separate fee for an SMSTS test—most course providers, like ReadTraining Learning, charge only for the SMSTS Course."
          }
        ]
      },
      {
        id: "what-training-and-qualifications-do-i-need-to-become-a-site-manager",
        heading: "What Training and Qualifications Do I Need to Become a Site Manager?",
        blocks: [
          {
            type: "p",
            text: "You must undertake some formal qualifications and informal training to take up a site management role."
          },
          {
            type: "h3",
            text: "Formal Qualifications"
          },
          {
            type: "p",
            text: "Once you’ve completed your secondary education, you will need formal construction qualification to work in a site management role. The most common qualifications are NVQs, SVQs, first aid training, health and safety training, or apprenticeships."
          },
          {
            type: "p",
            text: "There are two requirements you must fulfil to become a site manager:"
          },
          {
            type: "ul",
            items: [
              "Requirement 1: Getting a CSCS Black Card or CSCS White Card."
            ]
          },
          {
            type: "p",
            text: "If you want to learn how to get these CSCS cards, read our blogs on How to Get a CSCS Black Card? and CSCS White Card: Learn About Its Types, Costs, Renewal, and More."
          },
          {
            type: "ul",
            items: [
              "Requirement 2: Passing an SMSTS training course."
            ]
          },
          {
            type: "p",
            text: "To get enrolled on the SMSTS training course, check out ReadTraining Learning’s CITB Site Manager Safety Training Scheme (SMSTS)."
          },
          {
            type: "h3",
            text: "Work Experience"
          },
          {
            type: "p",
            text: "Formal training and qualifications are not enough to get a site management role. You also require work experience as a site supervisor, estimator, surveyor, or building technician."
          }
        ]
      },
      {
        id: "what-is-the-smsts-course",
        heading: "What is the SMSTS course?",
        blocks: [
          {
            type: "p",
            text: "This five-day Site Management Safety Training Scheme (SMSTS) training course equips learners with the required knowledge and skills to ensure healthy and safe conditions for construction site employees."
          },
          {
            type: "p",
            text: "The SMSTS course is for site managers, project managers, supervisors, business proprietors and client-based personnel. If you’re looking for a job with managerial responsibilities for workers on a construction site, the SMSTS course is a mandatory requirement."
          }
        ]
      },
      {
        id: "which-cscs-card-do-i-need-to-become-a-site-manager",
        heading: "Which CSCS Card Do I Need to Become a Site Manager",
        blocks: [
          {
            type: "p",
            text: "You need a CSCS White Card or CSCS Black Card to work as a site manager."
          }
        ]
      },
      {
        id: "how-to-get-a-cscs-black-card",
        heading: "How to Get a CSCS Black Card?",
        blocks: [
          {
            type: "p",
            text: "To get a CSCS Black Card, you must fulfil the following requirements:"
          },
          {
            type: "ul",
            items: [
              "Pass a relevant Construction Management/Technical related NVQ/SVQ Level 4, 5, 6, or 7. Alternatively, you can get an SVQ at SCQF Level 10 or 11 in a Construction Management/Technical related qualification.",
              "Pass the CITB Health Safety & Environment Test for Managers and Professionals (MAP)",
              "Submit an online application."
            ]
          }
        ]
      },
      {
        id: "how-to-get-a-cscs-white-card",
        heading: "How to Get a CSCS White Card?",
        blocks: [
          {
            type: "p",
            text: "The following are the major requirements to get a CSCS White Card:"
          },
          {
            type: "ul",
            items: [
              "For the CSCS White Card (Academically Qualified Person), possess a higher level qualification in their area of expertise, such as HNDs, HNCs, CIOB Certificates, a NEBOSH diploma, or a degree.",
              "For the CSCS White Card (Professionally Qualified Person), possess evidence of the current membership with a professional organisation at a level that CSCS accepts.",
              "Pass a minimum of an NVQ Level 7 qualification",
              "Pass the CITB Health Safety & Environment Test for Managers and Professionals (MAP)",
              "Submit an online application."
            ]
          },
          {
            type: "p",
            text: "You can choose the required qualification from a list of alternatives. Please visit the CITB website or contact them on 0344 994 4400 (Monday to Friday, 9 a.m. to 5 p.m)"
          }
        ]
      },
      {
        id: "relevant-courses-for-other-cscs-cards",
        heading: "Relevant Courses for Other CSCS Cards",
        blocks: [
          {
            type: "p",
            text: "If you want to get other CSCS cards, such as the CSCS Blue Card, check out the following relevant courses."
          },
          {
            type: "ul",
            items: [
              "NVQ Level 2 Diploma in Plastering",
              "Level 2 NVQ Diploma in Roofing Occupations (Construction)",
              "Level 2 Diploma in Decorative Finishing and Industrial Paint",
              "Level 2 NVQ Certificate in Wall and Floor Tiling"
            ]
          }
        ]
      }
    ]
  },
  "sssts-mock-test": {
    exam: {
      questions: 30,
      passMark: 80,
      minutes: 30
    },
    lead: "The SSSTS Mock Test consists of {questions} multiple-choice questions. It covers topics related to the responsibilities of a site supervisor for health and safety on a construction site. You will have {minutes} minutes to complete the test, and you must correctly answer {passCount} questions out of {questions}. For learning, you can check the correct answers.",
    mockHeading: "SSSTS Mock Test",
    tests: [
      {
        slug: "test-1ab",
        title: "SSSTS (Test 1)"
      },
      {
        slug: "test-2",
        title: "SSSTS (Test 2)"
      },
      {
        slug: "test-3",
        title: "SSSTS (Test 3)"
      },
      {
        slug: "test-4",
        title: "SSSTS (Test 4)"
      },
      {
        slug: "test-5",
        title: "SSSTS (Test 5)"
      }
    ],
    more: [
      "smsts-mock-test",
      "cscs-mock-test-for-managers-and-professionals",
      "citb-mock-test-50-questions",
      "cscs-mock-test"
    ],
    sections: [
      {
        id: "what-is-the-sssts-course",
        heading: "What is the SSSTS course?",
        blocks: [
          {
            type: "p",
            text: "The Site Supervisors� Safety Training Scheme (SSSTS) course is a part of the CITB Site Safety Plus (SSP) suite of courses. It is designed for supervisors operating in construction to reduce the likelihood of accidents on sites. This course certifies that an individual has undergone the necessary training and evaluation process to ensure his safety and that of others around them. This course is specifically for site supervisors who are responsible for guiding and overseeing workers on a site."
          },
          {
            type: "p",
            text: "The SSSTS course certificate demonstrates to your employers that you are qualified and trained in safety principles. This increases the likelihood of you securing a job on a site. In fact, the SSSTS course has now become more of a requirement to work as a supervisor in construction in the UK. Thus, passing the course increases your chances of getting better jobs. More and more, there are over 1000 jobs listed on Indeed alone, specifically demanding the SSSTS certification."
          },
          {
            type: "p",
            text: "The SSSTS Mock Test on this page is developed to help you revise the CITB Site Supervisors� Safety Training Scheme course. This includes the questions in the same style as you would experience in the actual test. It is a practice exam to walk you through the process so you�re well prepared and confident about what to expect."
          },
          {
            type: "note",
            text: "Please note that the questions in this mock test will not exactly be the same as the actual test. This mock test is designed for content revision and self-evaluation purposes."
          }
        ]
      },
      {
        id: "sssts-site-supervisor-safety-training-scheme-mock-test",
        heading: "SSSTS (Site Supervisor Safety Training Scheme) Mock Test",
        blocks: [
          {
            type: "p",
            text: "The SSSTS Mock Test is for individuals who are considering or already have supervisory responsibilities. It�s a free mock test that you can attempt as many times as you want without any limit. It�s a great way to practice your SSSTS exam before you appear in the real test. Upon passing the SSSTS test, you can apply for the CSCS Gold Card . Although it is not a requirement, it is highly regarded by employers."
          }
        ]
      },
      {
        id: "site-supervisory",
        heading: "Site Supervisory",
        blocks: [
          {
            type: "p",
            text: "Site supervisory is a senior role that involves multiple construction site duties, mainly managing projects, overseeing tasks, and liaising with staff. This role not only involves hands-on responsibilities but also requires strong leadership skills. As a site supervisor, your job involves:"
          },
          {
            type: "p",
            text: "1. Delegating tasks to your team."
          },
          {
            type: "p",
            text: "2. Acting as a liaison between your team and the manager."
          },
          {
            type: "p",
            text: "3. Identifying areas where the team needs improvement."
          },
          {
            type: "p",
            text: "4. Recognising safety hazards and suggesting ways to reduce their chances of happening."
          },
          {
            type: "p",
            text: "5. Keeping track of attendance."
          },
          {
            type: "p",
            text: "6. Holding your team responsible for their tasks."
          },
          {
            type: "p",
            text: "Site supervisory has an excellent career progression; therefore, many workers consider transitioning into a site supervisor role. You can also work your way up to the managerial position and get a CSCS Black card."
          }
        ]
      },
      {
        id: "what-training-and-qualifications-do-i-need-to-become-a-site-supervisor",
        heading: "What Training and Qualifications Do I Need to Become a Site Supervisor?",
        blocks: [
          {
            type: "p",
            text: "You can become a site supervisor by undertaking different formal qualifications and informal training."
          },
          {
            type: "h3",
            text: "Formal Qualifications"
          },
          {
            type: "p",
            text: "After completing your secondary education, you will need to take some level of formal construction qualification to work in a supervisory role on a construction site. These qualifications include NVQs, first aid training , health and safety training, apprenticeships, etc."
          },
          {
            type: "p",
            text: "The following credentials are widely recognised in the construction industry and are suitable for those planning to pursue a career as site supervisors:"
          },
          {
            type: "ul",
            items: [
              "CSCS Gold Card: If you want to learn how to get the CSCS Gold Card, read our blog, CSCS Gold Card � Requirements, Application, Cost (2023) ."
            ]
          },
          {
            type: "ul",
            items: [
              "SSSTS Certification: To get enrolled on the SSSTS training course, check out ReadTraining Learning�s CITB Site Supervisor Safety Training (SSSTS) Online ."
            ]
          },
          {
            type: "p",
            text: "Passing the SSSTS course will not only help you get the supervisory job, but it also has several other benefits. For more information about this, read our blog Benefits of SSSTS Training ."
          },
          {
            type: "h3",
            text: "Work Experience"
          },
          {
            type: "p",
            text: "Along with formal training and qualifications, your practical experience is also required to become a site supervisor. It includes your work experience from your current position in the construction industry."
          },
          {
            type: "p",
            text: "In particular, you must have experience in managing and supervising projects and staff, evaluating staff performance, monitoring compliance, guiding team members, and checking the team members' progress."
          }
        ]
      },
      {
        id: "how-many-questions-are-there-in-the-sssts-test",
        heading: "How Many Questions Are There in the SSSTS Test?",
        blocks: [
          {
            type: "p",
            text: "In the SSSTS Mock Test, there are 30 multiple-choice questions that you can take unlimited tries on. At the end of the test, you will be displayed correct answers. This will allow you to go over the exam style questions and answers as many times as it is required to feel fully prepared."
          },
          {
            type: "p",
            text: "The actual SSSTS exam also consists of 30 questions, and you must answer 80% correctly to pass the exam. As CITB permits, candidates who score 80% marks but fail the safety critical questions can re-sit the examination. However, if a delegate scores 67% or less in the final examination, it is mandatory for them to attend the full course to re-sit the examination."
          }
        ]
      },
      {
        id: "how-long-does-the-sssts-qualification-last",
        heading: "How Long Does the SSSTS Qualification Last?",
        blocks: [
          {
            type: "p",
            text: "After passing the SSSTS course endorsed by CITB, the certificate you get stays valid for 5 years. You'll need a refresher course every 5 years before it expires to maintain its validity. If it does expire, you'll have to do the full SSSTS course again."
          }
        ]
      },
      {
        id: "can-you-become-a-site-manager-with-sssts",
        heading: "Can You Become a Site Manager with SSSTS?",
        blocks: [
          {
            type: "p",
            text: "The SSSTS course isn't the right choice to become a site manager. Instead, you should consider the Site Managers' Safety Training Scheme (SMSTS) course, which is also part of CITB's SSP courses. The SMSTS course is suitable for those aspiring to secure a managerial position."
          },
          {
            type: "p",
            text: "You can take a free SMSTS mock exam here , which includes 20 multiple-choice questions covering the same topics as in the SMSTS course. The certificate is valid for 5 years, and to keep it valid, you'll need to sign up for a refresher training programme before it expires. If it expires, you'll have to start the course over from the beginning."
          }
        ]
      },
      {
        id: "what-topics-does-the-sssts-mock-exam-cover",
        heading: "What Topics Does the SSSTS Mock Exam Cover?",
        blocks: [
          {
            type: "p",
            text: "The SSSTS mock test includes the same topics as the real SSSTS exam. It covers subjects relevant for those working as supervisors on construction sites, such as:"
          },
          {
            type: "p",
            text: "1. Legal responsibilities of a site supervisor."
          },
          {
            type: "p",
            text: "2. Establishing and maintaining health and safety management systems."
          },
          {
            type: "p",
            text: "3. Implementing risk assessment procedures."
          },
          {
            type: "p",
            text: "4. Conducting necessary statutory inspections and checks."
          },
          {
            type: "p",
            text: "5. Understanding the importance of reporting accidents."
          },
          {
            type: "p",
            text: "6. Managing first aid and emergency procedures."
          },
          {
            type: "p",
            text: "7. Taking on a leadership role to ensure worker safety."
          }
        ]
      },
      {
        id: "can-you-get-a-cscs-gold-card-with-sssts",
        heading: "Can You Get a CSCS Gold Card with SSSTS?",
        blocks: [
          {
            type: "p",
            text: "No, having the SSSTS course is not mandatory for applying for the CSCS Gold Card . It is an extra certification required if you want to work as a site supervisor in the UK. However, you can become a site supervisor without either of these certifications. Still, many employers prefer workers with proper health and safety training due to an increasing number of site accidents. This is why these credentials are highly valued and have become standard requirements for recruiting supervisors in the construction industry."
          },
          {
            type: "p",
            text: "To get a CSCS Gold Card , you must fulfil the following requirements:"
          },
          {
            type: "ul",
            items: [
              "Pass a construction-related Level 3 NVQ/SVQ in Occupational Work Supervision or Level 4 NVQ/SVQ in Construction Site Supervision. The following qualifications make you eligible for a CSCS Gold Card:",
              "Level 4 NVQ Diploma in Construction Site Supervision (Building and Civil Engineering)",
              "Level 3 NVQ Certificate in Wall and Floor Tiling",
              "NVQ Level 3 Diploma in Roofing Occupations",
              "Level 3 NVQ Diploma in Plastering",
              "Pass the CITB Health Safety & Environment Test for Supervisors. You can also connect with our support team and have us apply for the test on your behalf .",
              "Submit an online application ."
            ]
          },
          {
            type: "p",
            text: "There are several other options you can opt for to get the required qualification. You can visit the CITB website or contact them on 0344 994 4400 (Monday to Friday, 9 a.m. to 5 p.m.)."
          }
        ]
      },
      {
        id: "do-you-get-a-card-with-sssts",
        heading: "Do You Get a Card with SSSTS?",
        blocks: [
          {
            type: "p",
            text: "You might have heard about the SSSTS card, but in actuality, no such thing exists. On completing the SSSTS course, you will receive a certificate and will not get an SSSTS card. However, you will need a CSCS Gold Card (Supervisory) to become a site supervisor."
          }
        ]
      },
      {
        id: "relevant-courses-for-other-cscs-cards",
        heading: "Relevant Courses for Other CSCS Cards",
        blocks: [
          {
            type: "p",
            text: "Check out the relevant courses if you want to get other CSCS cards, such as CSCS Blue Card or CSCS Black Card ."
          },
          {
            type: "ul",
            items: [
              "CSCS Blue Card"
            ]
          },
          {
            type: "p",
            text: "NVQ Level 2 Diploma in Plastering"
          },
          {
            type: "p",
            text: "Level 2 NVQ Diploma in Roofing Occupations (Construction)"
          },
          {
            type: "p",
            text: "Level 2 Diploma in Decorative Finishing and Industrial Paint"
          },
          {
            type: "p",
            text: "Level 2 NVQ Certificate in Wall and Floor Tiling"
          },
          {
            type: "ul",
            items: [
              "CSCS Black Card"
            ]
          },
          {
            type: "p",
            text: "Level 6 NVQ Diploma in Construction Site Management"
          },
          {
            type: "p",
            text: "Level 6 NVQ Diploma in Construction Contracting Operations Management"
          }
        ]
      }
    ]
  },
  "free-cpcs-renewal-mock-test-questions-and-answers": {
    exam: {
      questions: 15,
      passMark: 80,
      minutes: 15
    },
    lead: "The CPCS Renewal Test (Mock Exam) is designed for individuals whose CPCS cards have either expired or are nearing their expiry date. Passing this test is a requirement to apply for card renewal. The mock exam includes {questions} multiple-choice questions, similar in style to the actual CPCS Renewal Test. You can take this mock test as many times as needed to prepare for the CPCS Renewal test.",
    mockHeading: "CPCS Blue Card Renewal Mock Test",
    tests: [
      {
        slug: "a09-forward-tipping-dumper-mock-test",
        title: "A09 Forward Tipping Dumper Mock Test",
        passMark: 80,
        minutes: 15
      },
      {
        slug: "forklift-theory-mock-test",
        title: "Forklift Theory Mock Test",
        passMark: 88,
        minutes: 45
      },
      {
        slug: "rt02-crawler-crane-mock-test",
        title: "RT02 Crawler Crane Mock Test",
        passMark: 80,
        minutes: 15
      },
      {
        slug: "rt-o4-tower-crane-mock-test",
        title: "RT04 Tower Crane Mock Test",
        passMark: 80,
        minutes: 15
      },
      {
        slug: "rt17-cpcs-telehandler-mock-test",
        title: "RT17 CPCS Telehandler Mock Test",
        passMark: 80,
        minutes: 15
      },
      {
        slug: "rt59-360-excavator-renewal-mock-test",
        title: "RT59 360 Excavator Renewal Mock Test",
        subtitle: "CPCS 360 Excavator Renewal Mock Test",
        passMark: 80,
        minutes: 15
      }
    ],
    more: [
      "cscs-green-card-mock-test",
      "sssts-mock-test",
      "smsts-mock-test",
      "cscs-mock-test-for-managers-and-professionals",
      "iosh-managing-safely-exam-questions",
      "cpcs-360-excavator-mock-test",
      "citb-mock-test-50-questions",
      "cscs-mock-test"
    ],
    sections: [
      {
        id: "what-is-the-cpcs-renewal-test",
        heading: "What is the CPCS Renewal Test?",
        blocks: [
          {
            type: "p",
            text: "The Construction Plant Competence Scheme (CPCS) is an organisation that aims to help construction workers develop their skills. They provide cards to workers who operate plant machinery to ensure they can do so safely and competently without risking harm to others."
          },
          {
            type: "p",
            text: "These cards have a specific validity period. For example, the CPCS Blue Operator Card is valid for 5 years. Your employer may ask you to renew your CPCS card to keep your job. To do this, you'll need to take the CPCS Renewal Test. If you pass this test, you'll be eligible to apply for the card renewal. Here's a simple guide on how to renew your CPCS Blue Card:"
          },
          {
            type: "p",
            text: "1. Have a Valid Operator Card (Blue)"
          },
          {
            type: "p",
            text: "2. Pass the CITB HS&E Test —this test assesses your health and safety knowledge to ensure you can keep yourself and others safe on construction sites. It consists of multiple-choice questions and is valid for 2 years. You should hold a valid CITB certificate with your ID at the top during the renewal process."
          },
          {
            type: "p",
            text: "3. Pass the CPCS Renewal Test — this test also consists of multiple-choice questions. You must hold a valid certificate at the time of card renewal. To ensure you choose the right test, use the National Open College Network (NOCN) CPCS Renewal Test Tool, which helps you select the test based on your experience and background."
          },
          {
            type: "p",
            text: "4. Pass the CPCS Practical Test — this practical assessment involves operating the plant machinery. The specific machine you operate depends on the test you book. If you're unsure which test to take, refer back to the third point in this list."
          },
          {
            type: "p",
            text: "5. Fill out an application form and submit it to the mailing address provided on the back of the application form."
          }
        ]
      },
      {
        id: "requirements-for-cpcs-card-renewal",
        heading: "Requirements for CPCS Card Renewal",
        blocks: [
          {
            type: "p",
            text: "You can renew your CPCS Card up to 3 months before it expires. If you collect the required documents as listed in the guide, you'll be able to renew your card. However, if, for some reason, you don't renew your card for up to 5 years after it has expired, you'll need to begin the entire process from the beginning. This process involves passing a relevant qualification, the CITB test, the CPCS Theory Test, and the CPCS Practical Test."
          }
        ]
      },
      {
        id: "cpcs-card-renewal-test-preparation",
        heading: "CPCS Card Renewal Test – Preparation",
        blocks: [
          {
            type: "p",
            text: "The CPCS Renewal Test follows the same format as the actual CPCS Test. You can take this practice exam as many times as you need to feel confident and fully prepared."
          },
          {
            type: "p",
            text: "Even if you're an experienced machine operator, it's a good idea to review the content before taking the test. The curriculum frequently updates, and to stay current with industry standards, the industry requires you to pass these renewal tests. The key to passing the CPCS Renewal Test is being well-prepared, and the practice exam helps you get familiar with the type of questions you'll encounter."
          },
          {
            type: "p",
            text: "You can also download CPCS Factsheets for free on the CPCS website. Before booking the test, it's a wise step to go through these sheets to understand what to expect in the test. In fact, it's a good idea to read them before taking the practice exam, as it will boost your confidence and help you score well."
          }
        ]
      },
      {
        id: "book-your-cpcs-renewal-test",
        heading: "Book your CPCS Renewal Test",
        blocks: [
          {
            type: "p",
            text: "You can book the CPCS Renewal Test either online or over the phone. The online process is generally more straightforward because you provide your details when submitting an application. However, applying over the phone can sometimes lead to unnecessary confusion, so it's not the recommended option. After booking the test, whether online or by phone, you will receive additional information about the exact date and time of your test."
          }
        ]
      },
      {
        id: "how-many-questions-are-in-the-cpcs-renewal-test",
        heading: "How Many Questions Are in the CPCS Renewal Test?",
        blocks: [
          {
            type: "p",
            text: "The CPCS Renewal test has 15 multiple-choice questions, and you have 15 minutes to answer them all. To pass the exam, you need to answer at least 12 questions correctly. In essence, you have about a minute to choose your answers for each question."
          }
        ]
      },
      {
        id: "how-long-does-a-blue-cpcs-card-last",
        heading: "How Long Does a Blue CPCS Card Last?",
        blocks: [
          {
            type: "p",
            text: "The CPCS Blue Card remains valid for 5 years. After it expires, you'll need to take the renewal test and collect the necessary documents to start the renewal application."
          }
        ]
      }
    ]
  },
  "level-1-health-and-safety-in-a-construction-environment-mock-test": {
    exam: {
      questions: 40,
      passMark: 80,
      minutes: 60
    },
    lead: "Boost your confidence with our test prep trusted by 200,000+ successful learners. This comprehensive toolkit includes level 1 health and safety in a construction environment mock exams and 1000+ practice questions designed to help you pass on your first attempt.",
    mockHeading: "Level 1 Health and Safety in a Construction Environment Mock Test 2026",
    tests: [
      {
        slug: "l1hsce-1",
        title: "Level 1 Health and Safety in a Construction Environment Mock Test 1",
        subtitle: "L1HSCE Mock Test 1"
      },
      {
        slug: "l1hsce-2",
        title: "Level 1 Health and Safety in a Construction Environment Mock Test 2",
        subtitle: "L1HSCE Mock Test 2"
      },
      {
        slug: "l1hsce-3",
        title: "Level 1 Health and Safety in a Construction Environment Mock Test 3",
        subtitle: "L1HSCE Mock Test 3"
      },
      {
        slug: "l1hsce-4",
        title: "Level 1 Health and Safety in a Construction Environment Mock Test 4",
        subtitle: "L1HSCE Mock Test 4"
      },
      {
        slug: "l1hsce-5",
        title: "Level 1 Health and Safety in a Construction Environment Mock Test 5",
        subtitle: "L1HSCE Mock Test 5"
      },
      {
        slug: "l1hsce-6",
        title: "Level 1 Health and Safety in a Construction Environment Mock Test 6",
        subtitle: "L1HSCE Mock Test 6"
      },
      {
        slug: "l1hsce-7",
        title: "Level 1 Health and Safety in a Construction Environment Mock Test 7",
        subtitle: "L1HSCE Mock Test 7"
      },
      {
        slug: "l1hsce-8",
        title: "Level 1 Health and Safety in a Construction Environment Mock Test 8",
        subtitle: "L1HSCE Mock Test 8"
      }
    ],
    more: [],
    sections: [
      {
        id: "level-1-health-and-safety-in-a-construction-environment-mock-test-2026",
        heading: "Level 1 Health and Safety in a Construction Environment Mock Test 2026",
        blocks: [
          {
            type: "p",
            text: "The level 1 health and safety in a construction environment mock test evaluates your understanding of essential site safety principles, from hazard recognition to risk control."
          },
          {
            type: "p",
            text: "Our test prep toolkit provides 1000+ practice questions to help you master the five core learning outcomes of the official Health and Safety Level 1 in a construction environment exam syllabus, ensuring you are fully prepared to pass this assessment, a mandatory component of your CSCS application."
          }
        ]
      },
      {
        id: "level-1-health-and-safety-in-a-construction-environment-mock-exam-details",
        heading: "Level 1 Health and Safety in a Construction Environment Mock Exam Details",
        blocks: [
          {
            type: "p",
            text: "Our mock tests are designed to align with the official 2026 standards. The structure is exactly similar to the real exam to help you manage your time and pass on your first try:"
          },
          {
            type: "ul",
            items: [
              "Exam Format: Multiple-choice questions.",
              "Total Questions: 40 questions.",
              "Time Limit: 60 minutes.",
              "Pass Mark: 80% (32 out of 40 correct answers)."
            ]
          },
          {
            type: "h3",
            text: "Take Live Mocks to Prepare Better"
          },
          {
            type: "p",
            text: "Taking a mock exam for the level 1 health and safety in a construction environment on your computer or PC is the best way to build exam-day confidence. When you tap \"Start Free Test,\" you will be presented with 8 different versions of our health and safety level 1 mock test in a construction environment, each designed to simulate the real pressure of the assessment."
          },
          {
            type: "p",
            text: "Simply choose one to begin your session. Completing these questions within the 60-minute limit is crucial for mastering your time management. Once you submit, your instant score will highlight exactly which areas you have mastered and where you need more focus. This allows you to review your results and prepare effectively for your official exam."
          }
        ]
      },
      {
        id: "what-is-included-in-this-test-prep",
        heading: "What is Included in this Test Prep",
        blocks: [
          {
            type: "p",
            text: "This resource library acts as a full study package, providing everything required to help you pass your exam on the first attempt. It Includes:"
          },
          {
            type: "ul",
            items: [
              "8 Full-Length Mock Tests: These 40-question sessions are timed for 60 minutes to perfectly mirror the real health and safety level 1 in a construction environment test. Practising with these modules ensures you are comfortable with the exam format and pressure before the big day.",
              "Comprehensive Revision Book: Alongside the mocks, you get a downloadable study guide packed with over 300 practice questions. This allows you to refresh your knowledge for the construction environment level 1 health and safety at your own pace, anytime and anywhere."
            ]
          },
          {
            type: "p",
            text: "Both the mock tests and the revision handbook are available at no cost. You can take each mock exam as many times as you like to build your confidence and refresh your knowledge from the book whenever you need to."
          }
        ]
      },
      {
        id: "why-practice-with-readtraining",
        heading: "Why Practice With ReadTraining?",
        blocks: [
          {
            type: "p",
            text: "Our test prep resources are built to help you pass the exam with confidence and move forward in your career:"
          },
          {
            type: "ul",
            items: [
              "Expertly Crafted – Designed by industry experts for total industry accuracy",
              "Realistic Format – Mock exams updated to the latest 2026 official standards",
              "Instant Scoring – Get immediate results and track progress after every test",
              "Unlimited Access – Retake the Level 1 construction mock exam as often as needed",
              "Free Study Guide – Downloadable Level 1 health and safety handbook included free"
            ]
          },
          {
            type: "p",
            text: "Still worried about passing? There’s no need. With over 15 years of industry experience, ReadTraining has maintained a 96% pass rate. Our Level 1 Health and Safety in a Construction Environment mock tests are designed by experts to give you the confidence to pass your assessment on the very first attempt."
          }
        ]
      }
    ],
    faqs: [
      {
        q: "Is this the same as the CITB Health, Safety & Environment (HS&E) Operatives Mock Exam?",
        a: "No. These are two separate requirements. The level 1 health and safety in a construction environment mock test is for the training qualification, whereas the CITB Operatives Test is a separate exam. You need both to apply for a CSCS Green Card."
      },
      {
        q: "How many questions are in the Level 1 Health and Safety in a Construction Environment mock exam?",
        a: "Each mock exam consists of 40 multiple-choice questions on core site safety and mimics the real exam."
      },
      {
        q: "What is the pass mark for the mock test?",
        a: "To pass the construction environment level 1 health and safety mock test, you must achieve at least 80% (32 out of 40 correct answers)."
      },
      {
        q: "What if I fail the Level 1 Health and Safety in a Construction Environment mock exam?",
        a: "There is no limit to how many times you can practice. If you do not pass a mock test on your first attempt, simply review your incorrect answers and try again. You can take these until you feel confident, and download our free resource book to prepare for the official exam."
      }
    ]
  },
  "sia-top-up-mock-tests": {
    exam: {},
    lead: "Access over 200 up-to-date mock test questions for the SIA Door Supervisor and Security Guard top-up exams. Includes instant answers, feedback, and a downloadable PDF.",
    mockHeading: "SIA Top-Up Mock Tests",
    tests: [
      {
        slug: "wds-refresher-1",
        title: "Unit 1: Top-Up Refresher for Door Supervisors (Test 1)",
        subtitle: "Principles of Working as a Door Supervisor (Refresher) Test 1",
        passMark: 71,
        minutes: 55
      },
      {
        slug: "wds-refresher-2",
        title: "Unit 1: Top-Up Refresher for Door Supervisors (Test 2)",
        subtitle: "Principles of Working as a Door Supervisor (Refresher) Test 2",
        passMark: 71,
        minutes: 55
      },
      {
        slug: "wds-refresher-3",
        title: "Unit 1: Top-Up Refresher for Door Supervisors (Test 3)",
        subtitle: "Principles of Working as a Door Supervisor (Refresher) Test 3",
        passMark: 71,
        minutes: 55
      },
      {
        slug: "wso-refresher-1",
        title: "Unit 1: Top-Up Refresher for Security Officers (Test 1)",
        subtitle: "Principles of Working as a Security Officer in the Private Security Industry (Refresher) Test 1",
        passMark: 71,
        minutes: 45
      },
      {
        slug: "wso-refresher-2",
        title: "Unit 1: Top-Up Refresher for Security Officers (Test 2)",
        subtitle: "Principles of Working as a Security Officer in the Private Security Industry (Refresher) Test 2",
        passMark: 71,
        minutes: 45
      },
      {
        slug: "wso-refresher-3",
        title: "Unit 1: Top-Up Refresher for Security Officers (Test 3)",
        subtitle: "Principles of Working as a Security Officer in the Private Security Industry (Refresher) Test 3",
        passMark: 71,
        minutes: 45
      },
      {
        slug: "api-refresher-1",
        title: "Unit 2: Top-Up Refresher for Door Supervisors (Test 1)",
        subtitle: "Application of Physical Intervention Skills in the Private Security Industry (Refresher) Test 1",
        passMark: 80,
        minutes: 45
      },
      {
        slug: "api-refresher-2",
        title: "Unit 2: Top-Up Refresher for Door Supervisors (Test 2)",
        subtitle: "Application of Physical Intervention Skills in the Private Security Industry (Refresher) Test 2",
        passMark: 80,
        minutes: 45
      },
      {
        slug: "api-refresher-3",
        title: "Unit 2: Top-Up Refresher for Door Supervisors (Test 3)",
        subtitle: "Application of Physical Intervention Skills in the Private Security Industry (Refresher) Test 3",
        passMark: 80,
        minutes: 45
      }
    ],
    more: [
      "sia-mock-test"
    ],
    sections: [
      {
        id: "about-these-sia-top-up-exam-questions-and-mock-tests",
        heading: "About These SIA Top-Up Exam Questions and Mock Tests",
        blocks: [
          {
            type: "p",
            text: "If you're renewing your SIA licence, you're required to complete an SIA Top-Up course, whether you're a Door Supervisor or a Security Guard. These free SIA Top-Up mock tests are designed to help you prepare with confidence."
          },
          {
            type: "p",
            text: "We've created separate mock tests for each unit of the SIA Top-Up qualification, based on the latest exam format. You'll find:"
          },
          {
            type: "ul",
            items: [
              "3 mock tests for Unit 1 (Top-Up Door Supervisor) – Principles of Working as a Door Supervisor",
              "3 mock tests for Unit 2 (Top-Up Door Supervisor) – Physical Intervention Skills",
              "3 mock tests for Unit 1 (Top-Up Security Guard) – Principles of Working as a Security Officer"
            ]
          },
          {
            type: "p",
            text: "Each test follows the official SIA Top-Up multiple-choice format, with instant answers and explanations. You can retry any test as often as you like, or download our test prep book as a PDF for offline revision."
          },
          {
            type: "p",
            text: "These mock exams are ideal for anyone taking a Top-Up course — helping you practise in advance, spot knowledge gaps, and walk into your exam with confidence."
          }
        ]
      },
      {
        id: "what-are-the-real-sia-top-up-exams-like",
        heading: "What Are the Real SIA Top-Up Exams Like?",
        blocks: [
          {
            type: "p",
            text: "Before you take a mock test, it’s useful to understand how the real SIA Top-Up exams are structured. Each Top-Up course includes a multiple-choice exam that you must pass to renew your licence. Our mock tests are based on the same format, so you can practise in a realistic way."
          },
          {
            type: "h3",
            text: "Door Supervisor Top-Up (MCQ Only)"
          },
          {
            type: "table",
            rows: [
              [
                "Unit",
                "Pass Mark",
                "Duration"
              ],
              [
                "Unit 1: Principles of Working as a Door Supervisor",
                "25/35 (71%)",
                "55 minutes"
              ],
              [
                "Unit 2: Physical Intervention Skills",
                "24/30 (80%)",
                "45 minutes"
              ]
            ]
          },
          {
            type: "h3",
            text: "Security Guard Top-Up (MCQ Only)"
          },
          {
            type: "table",
            rows: [
              [
                "Unit",
                "Pass Mark",
                "Duration"
              ],
              [
                "Unit 1: Principles of Working as a Security Officer",
                "25/35 (71%)",
                "55 minutes"
              ]
            ]
          },
          {
            type: "note",
            text: "These mock tests focus only on the multiple-choice part of the exam. The real Top-Up qualifications also include practical assessments (e.g. use of radios or physical intervention demonstrations), which are not covered here."
          }
        ]
      },
      {
        id: "download-sia-top-up-practice-questions-pdf",
        heading: "Download SIA Top-Up Practice Questions (PDF)",
        blocks: [
          {
            type: "p",
            text: "Prefer to revise offline? We’ve created a free PDF containing a wide range of multiple-choice questions from each SIA Top-Up unit — perfect for practising anywhere, anytime."
          },
          {
            type: "ul",
            items: [
              "100 MCQs from Unit 1 – Door Supervisor (Top-Up)",
              "100 MCQs from Unit 2 – Door Supervisor (Top-Up)",
              "100 MCQs from Unit 1 – Security Guard (Top-Up)",
              "✅ Includes correct answers"
            ]
          }
        ]
      }
    ],
    faqs: [
      {
        q: "How many questions are there in the SIA Top-Up exam?",
        a: "For Door Supervisors, there are 35 MCQs in Unit 1 and 30 in Unit 2. For Security Guards, there are 35 MCQs in the single unit."
      },
      {
        q: "What is the pass mark for the SIA Top-Up exam?",
        a: "You must score 71% in Unit 1 (25/35) and 80% in Unit 2 (24/30) for Door Supervisor. Security Guards must score 71% (25/35)."
      },
      {
        q: "Are these mock tests like the real SIA exam?",
        a: "Yes. All questions follow the official multiple-choice format and are based on the current Highfield specifications."
      },
      {
        q: "Do I need to pay for these mock tests?",
        a: "No — they’re completely free. You can take each one as many times as you like."
      },
      {
        q: "Do these tests cover the practical parts of the Top-Up course?",
        a: "No. These mock exams cover only the multiple-choice sections. The real Top-Up course also includes a practical assessment, which you must complete separately."
      },
      {
        q: "Can I download the questions as a PDF?",
        a: "Yes. Scroll up to download our free PDF with sample MCQs and answers from each unit."
      }
    ]
  },
  "cpcs-360-excavator-mock-test": {
    exam: {
      questions: 20,
      passMark: 80,
      minutes: 15
    },
    lead: "The CPCS 360° Excavator Theory Mock Test includes {questions} multiple-choice questions. You must answer {passCount} out of {questions} questions correctly to pass. This practice test is for individuals aiming to book the CPCS (A59) Excavator Training Programme (Above 10 Tonnes). You can take unlimited attempts on this free mock test and work towards the CPCS Trained Operator Card.",
    mockHeading: "RT59 360 Excavator Renewal Mock Test",
    tests: [
      {
        slug: "rt59-360-excavator-renewal-mock-test",
        title: "RT59 360 Excavator Renewal Mock Test",
        subtitle: "CPCS 360 Excavator Renewal Mock Test"
      }
    ],
    more: [
      "cscs-green-card-mock-test",
      "sssts-mock-test",
      "smsts-mock-test",
      "cscs-mock-test-for-managers-and-professionals",
      "iosh-managing-safely-exam-questions",
      "free-cpcs-renewal-mock-test-questions-and-answers",
      "citb-mock-test-50-questions",
      "cscs-mock-test"
    ],
    sections: [
      {
        id: "what-is-the-cpcs-a59-excavator-training-programme",
        heading: "What is the CPCS (A59) Excavator Training Programme?",
        blocks: [
          {
            type: "p",
            text: "The Construction Plant Competence Scheme (CPCS) 360 Excavator Course is for individuals who operate diggers and excavators on construction sites. There are two categories based on weight:"
          },
          {
            type: "p",
            text: "1. CPCS A58 Excavator 360° Course – Below 10 tonnes. 2. CPCS A59 Excavator 360° Course – Above 10 tonnes."
          },
          {
            type: "p",
            text: "Generally, excavators in the below 10 tonnes category are good for digging foundations up to 15 ft deep. Larger excavators are better suited for heavy-duty tasks like demolition and digging foundations for big structures such as shopping malls and apartments. These courses are also split into Tracked or Wheeled machine categories. If you complete the Excavator Course A59, you can operate both types of machines."
          },
          {
            type: "p",
            text: "Choose the right training programme based on your job requirements."
          },
          {
            type: "p",
            text: "This mock test is for the above 10 tonnes category, specifically the CPCS (A59) 360° Excavator Course. This theory test will familiarise you with the types of questions you'll experience in the actual CPCS theory test, which lasts one hour. Afterwards, there's a 70-minute practical test. You need both certificates to qualify for the CPCS Trained Operator Card."
          }
        ]
      },
      {
        id: "what-topics-does-this-cpcs-360-excavator-mock-test-cover",
        heading: "What Topics Does this CPCS 360° Excavator Mock Test Cover?",
        blocks: [
          {
            type: "p",
            text: "This mock exam follows the same format as the actual test and includes these topics:"
          },
          {
            type: "p",
            text: "1. Legal requirements 2. Operator responsibilities 3. Basic machine operation knowledge 4. Safety procedures for excavator operation 5. Considerations for various types of terrain during excavation 6. Equipment installation."
          }
        ]
      },
      {
        id: "what-is-a-cpcs-red-card",
        heading: "What is a CPCS Red Card?",
        blocks: [
          {
            type: "p",
            text: "The CPCS Red or Trained Operator Card confirms that you meet CPCS standards and are qualified for on-site work. It's a temporary card that gives you time until you complete your qualification and upgrade to the skilled Blue CPCS Card, which signifies your competence and earns you national recognition. While the Red Card cannot be renewed, you can extend it for an additional 12 months if you've enrolled on an NVQ/SVQ. For more details, you can contact CPCS at 0300 999 1177, available from 9 AM to 4 PM (Monday - Thursday) and 9 AM to 3:30 PM (Friday)."
          }
        ]
      },
      {
        id: "how-to-get-a-cpcs-red-trained-operator-card",
        heading: "How to Get a CPCS Red Trained Operator Card?",
        blocks: [
          {
            type: "p",
            text: "The CPCS Red Card confirms that you have the necessary skills and understanding to operate machinery in the workplace. After completing a relevant NVQ/SVQ, you can upgrade to the Blue Skilled CPCS Card. The Red CPCS Card is temporary and expires after two years."
          },
          {
            type: "p",
            text: "To obtain a CPCS Red Card, you need to:"
          },
          {
            type: "p",
            text: "1. Complete machinery training (for excavators/diggers). 2. Pass the CITB Health, Safety and Environment (HS&E) Test for Operatives and Specialists, which assesses your knowledge of health and safety principles. This is also known as the CSCS test. Or, you can download this free handbook with 400 Questions and Answers to prepare for the CITB Health, Safety and Environment test for Operatives and Specialists."
          },
          {
            type: "p",
            text: "3. Pass the CPCS Theory Test within two years of passing the CITB HS&E test. 4. Pass the CPCS Practical Test within six months of passing the CPCS Theory Test."
          },
          {
            type: "p",
            text: "Having these certificates qualifies you for the CPCS Red Card, which cannot be renewed. To learn about courses that lead to the CPCS Blue Card, please contact us at 0333 344 1293, 9 AM - 6 PM, Monday to Friday, excluding bank holidays."
          }
        ]
      },
      {
        id: "how-much-does-the-excavator-training-cost",
        heading: "How Much Does the Excavator Training Cost?",
        blocks: [
          {
            type: "p",
            text: "The training costs depend on your expertise level, which also affects the type of course you want to book. Another important cost factor is the choice of machinery – tracked or wheeled. On average, the course price ranges from £800 to £900."
          },
          {
            type: "p",
            text: "To help cover these costs, you can inquire with CITB to see if you're eligible for funding."
          }
        ]
      },
      {
        id: "how-long-is-the-cpcs-excavator-training",
        heading: "How long is the CPCS Excavator Training?",
        blocks: [
          {
            type: "p",
            text: "The course duration depends on your experience in the field. If you have years of experience operating excavators or diggers, you can book the 3-Day course to earn a CPCS Red Card. However, if you're new to this or have little to no experience, we recommend the 9-day course. Your level of expertise will determine how long it takes. You can find more information about CITB courses below:"
          },
          {
            type: "p",
            text: "- CPCS Excavator 360° Tracked: Above 10 Tonnes A59 - experienced operators (3 days) - CPCS Excavator 360° Tracked: Above 10 Tonnes A59 (9 days)"
          }
        ]
      },
      {
        id: "how-is-the-360-excavator-theory-test-assessed",
        heading: "How is the 360 Excavator Theory Test Assessed?",
        blocks: [
          {
            type: "p",
            text: "When it comes to assessment, the 360 Excavator Theory Test differs from traditional training courses. It involves a verbal question-and-answer session with an examiner, where they present you with choices, and you need to select the correct answers. To pass the exam, you must answer 80% of the questions correctly. While this might sound challenging, with strategic planning and thorough preparation, you can pass the test quite comfortably."
          }
        ]
      }
    ]
  },
  "iosh-managing-safely-exam-questions": {
    exam: {
      questions: 20,
      passMark: 80,
      minutes: 45
    },
    lead: "The IOSH Managing Safely Mock Test consists of {questions} test questions. The test pass mark for IOSH Managing Safely Exam is {passMark}%, which means you must correctly answer {passCount} out of {questions} questions to pass the exam.",
    mockHeading: "IOSH Managing Safely Mock Exams",
    tests: [
      {
        slug: "iosh-managing-safely-test-1",
        title: "IOSH Managing Safely Safely (Test 1)"
      }
    ],
    more: [
      "cscs-green-card-mock-test",
      "sssts-mock-test",
      "smsts-mock-test",
      "cscs-mock-test-for-managers-and-professionals",
      "citb-mock-test-50-questions",
      "cscs-mock-test"
    ],
    sections: [
      {
        id: "iosh-free-test-exam-papers-with-answers",
        heading: "IOSH Free Test Exam Papers with Answers",
        blocks: [
          {
            type: "p",
            text: "The IOSH Managing Safely Mock Test is for middle managers, line managers, team leaders, supervisors, and anyone working in any sector who wants to learn the basics of safety and health. It is designed to help learners prepare for the real IOSH Managing Safely Exam."
          },
          {
            type: "p",
            text: "This mock test consists of MCQ-based IOSH exam questions and answers to give you an idea of what the real test would look like. Moreover, it will also help you test the knowledge you learned in the IOSH Managing Safely course. The best part is you can take this free IOSH mock exam as many times as you want."
          }
        ]
      },
      {
        id: "main-topics-covered-in-iosh-mock-test",
        heading: "Main Topics Covered in IOSH Mock Test",
        blocks: [
          {
            type: "p",
            text: "The questions in the exam will be relevant to the main course modules and could include:"
          },
          {
            type: "ul",
            items: [
              "Health and Safety Responsibilities",
              "Risk Assessment",
              "Accident Investigation",
              "Safety Management Systems",
              "Legal Compliance",
              "and more"
            ]
          }
        ]
      },
      {
        id: "what-is-the-iosh-managing-safely-exam",
        heading: "What is the IOSH Managing Safely Exam?",
        blocks: [
          {
            type: "p",
            text: "After completing the course, you must take an assessment based on multiple-choice questions. This assessment will test the knowledge you’ve gained in the IOSH Managing Safely course."
          },
          {
            type: "p",
            text: "Typically, you must take this assessment on the last day of the course, and your expert trainer will be there with you."
          },
          {
            type: "note",
            text: "This IOSH managing safely mock test helps you prepare for the first assessment, which is a multiple-choice exam."
          }
        ]
      },
      {
        id: "assessments-for-passing-the-iosh-managing-safely-course",
        heading: "Assessments for Passing the IOSH Managing Safely Course",
        blocks: [
          {
            type: "p",
            text: "There are two main assessments you need to fulfil to pass your IOSH Managing Safely Course successfully."
          },
          {
            type: "ul",
            items: [
              "a multiple-choice exam",
              "a practical work-based"
            ]
          },
          {
            type: "p",
            text: "After completing these two assessments, you will be awarded a Managing Safely certificate."
          }
        ]
      },
      {
        id: "the-cost-of-an-iosh-managing-safely-course",
        heading: "The Cost of an IOSH Managing Safely Course",
        blocks: [
          {
            type: "p",
            text: "The cost of an IOSH Managing Safely(SMSTS) course depends on the training provider. However, it’s approximately £250.00."
          }
        ]
      },
      {
        id: "the-cost-of-an-iosh-managing-safely-exam",
        heading: "The Cost of an IOSH Managing Safely Exam",
        blocks: [
          {
            type: "p",
            text: "There is no separate fee for an IOSH Managing Safely Exam—most course providers charge only for the IOSH Managing Safely course."
          }
        ]
      },
      {
        id: "what-is-iosh",
        heading: "What is IOSH?",
        blocks: [
          {
            type: "p",
            text: "IOSH stands for the Institution of Occupational Safety and Health. It is the world's Chartered body for safety and health professionals."
          }
        ]
      },
      {
        id: "what-if-you-fail-the-iosh-managing-safely-exam",
        heading: "What If You Fail the IOSH Managing Safely Exam?",
        blocks: [
          {
            type: "p",
            text: "We recommend you attempt this mock test many times before you take the real IOSH exam. If you fail this exam, you can re-sit. Most training providers offer unlimited reattempts for this exam. However, it depends on the training provider if you’ll have to pay the fees for re-sits."
          }
        ]
      }
    ]
  },
  "cscs-working-at-height-mock-test": {
    exam: {
      questions: 50,
      passMark: 90,
      minutes: 45
    },
    lead: "The CSCS Working at Height Mock Test is for individuals preparing to take their CITB HS&E specialist work at height test. The test consists of {questions} multiple-choice test questions to answer in {minutes} minutes. To pass the test, you must correctly answer at least {passCount}/{questions} questions, which is {passMark}%.",
    mockHeading: "CSCS Working At Height Mock (Test 1)",
    tests: [
      {
        slug: "cscs-working-at-height-mock-test-1",
        title: "CSCS Working At Height Mock (Test 1)"
      }
    ],
    more: [
      "cscs-green-card-mock-test",
      "sssts-mock-test"
    ],
    sections: [
      {
        id: "cscs-working-at-height-mock-test",
        heading: "CSCS Working at Height Mock Test",
        blocks: [
          {
            type: "p",
            text: "The CSCS mock test working at heights is for individuals preparing for their CITB HS&E specialist work at height test to get a CSCS card. The CSCS Specialists Test is one of the three types of CITB test. If you want to get a job as a roofer or any other role that requires working at heights, you must get a CSCS Blue Card."
          },
          {
            type: "p",
            text: "Upon passing the real CITB Specialist Working at Heights Test, you can apply for the CSCS Blue Card."
          }
        ]
      },
      {
        id: "what-is-the-cscs-specialist-working-at-heights-test",
        heading: "What is the CSCS Specialist Working at Heights Test?",
        blocks: [
          {
            type: "p",
            text: "The Specialist Work at Height (WAH) Test is basically a Specialist CITB Health, Safety, and Environment Test, one of the three types of CITB tests. This test has six core knowledge areas, of which five are from the Operatives CITB HS&E Test: Working environment occupational health, safety, high risk activities, and Specialist. However, the sixth area includes relevant questions in the chosen specialist areas, which is Work at Height (WAH) in this case."
          },
          {
            type: "p",
            text: "Like any other Specialist CITB HS&E Test, this test has 50 questions that you must complete in 45 minutes. It’s an MCQ-based test with a passing criteria of 90% (45 out of 50 questions must be correctly answered)."
          }
        ]
      },
      {
        id: "topics-covered-in-the-cscs-mock-test-working-at-heights",
        heading: "Topics Covered in the CSCS Mock Test Working at Heights",
        blocks: [
          {
            type: "ul",
            items: [
              "Working environment",
              "Occupational health",
              "Safety",
              "High risk activities",
              "Specialist",
              "Working at heights"
            ]
          },
          {
            type: "p",
            text: "The first five core topics of the CSCS test working at heights are from the CITB HS&E Test for Operatives."
          },
          {
            type: "p",
            text: "You can use this free CSCS mock test to practice the core knowledge questions."
          },
          {
            type: "p",
            text: "Download our free £12 worth of handbook with 400+ exam questions to prepare well for the test."
          },
          {
            type: "p",
            text: "At ReadTraining Learning, we help you with reserving your CITB test. Book Now!"
          }
        ]
      },
      {
        id: "how-much-does-the-cscs-working-at-heights-test-cost",
        heading: "How Much Does the CSCS Working at Heights Test Cost?",
        blocks: [
          {
            type: "p",
            text: "The CSCS working at heights test costs £23.50."
          }
        ]
      },
      {
        id: "test-pass-marks-for-the-working-at-heights-test",
        heading: "Test Pass Marks for the Working at Heights Test",
        blocks: [
          {
            type: "p",
            text: "You must correctly answer 45 MCQs out of 50 to meet the passing criteria for the CSCS test working at heights, which is 90%."
          }
        ]
      },
      {
        id: "required-training-and-qualification-to-get-a-cscs-blue-card-for-working-at-heights",
        heading: "Required Training & Qualification to Get a CSCS Blue Card for Working at Heights",
        blocks: [
          {
            type: "p",
            text: "For most job roles requiring you to work at heights, you must get a CSCS Blue Card. You can choose from different trainings & qualifications to get a CSCS Blue Card. The most common ones are Level 2 NVQ/SVQ or SVQ at SCQF Level 5 Qualification."
          },
          {
            type: "p",
            text: "We offer various NVQs at Levels 3 & 4 that provide access to the CSCS Blue Card. Check our courses here."
          },
          {
            type: "p",
            text: "Alternatively, you can also get a CSCS Blue Card without an NVQ."
          }
        ]
      },
      {
        id: "get-a-blue-cscs-card-without-an-nvq",
        heading: "Get a Blue CSCS Card without an NVQ",
        blocks: [
          {
            type: "p",
            text: "You can still get a CSCS Blue Card without an NVQ. Learn more about it by reading our blog, “How to Get a Blue CSCS Card without an NVQ?”"
          },
          {
            type: "p",
            text: "If you need more information, please visit the CITB website or contact them on 0344 994 4400 (Monday to Friday, 9 a.m. to 5 p.m.)."
          }
        ]
      },
      {
        id: "how-much-does-a-level-2-nvq-svq-cost",
        heading: "How Much Does a Level 2 NVQ/SVQ Cost?",
        blocks: [
          {
            type: "p",
            text: "The course fee of a Level 2 NVQ/SVQ offered by ReadTraining Learning is approximately £550, including VAT. Check our courses here."
          }
        ]
      },
      {
        id: "which-cscs-card-do-i-need-for-working-at-heights",
        heading: "Which CSCS Card Do I Need for Working at Heights?",
        blocks: [
          {
            type: "p",
            text: "You need a CSCS Blue Card for Working at Heights."
          }
        ]
      },
      {
        id: "how-to-get-a-cscs-blue-card",
        heading: "How to Get a CSCS Blue Card?",
        blocks: [
          {
            type: "p",
            text: "To get a CSCS Blue Card, you must fulfil the following requirements:"
          },
          {
            type: "ul",
            items: [
              "Pass a relevant construction-related Level 2 NVQ/SVQ or SVQ at SCQF Level 5 Qualification.",
              "Pass the Specialists CITB Health Safety & Environment Test.",
              "Submit an online application."
            ]
          },
          {
            type: "p",
            text: "If you want to learn more about applying for a CSCS card after passing the test, read our blog, “How to Get a CSCS Card after Passing the Test.”"
          }
        ]
      },
      {
        id: "relevant-courses-for-other-cscs-cards",
        heading: "Relevant Courses for Other CSCS Cards",
        blocks: [
          {
            type: "p",
            text: "If you want to get other CSCS cards, such as the CSCS Black Card, check out the following relevant courses."
          },
          {
            type: "p",
            text: "CSCS Black Card"
          },
          {
            type: "ul",
            items: [
              "Level 6 NVQ Diploma in Construction Site Management",
              "Level 6 NVQ Diploma in Construction Contracting Operations Management"
            ]
          },
          {
            type: "p",
            text: "CSCS Gold Card"
          },
          {
            type: "ul",
            items: [
              "Level 4 NVQ Diploma in Construction Site Supervision (Building and Civil Engineering)",
              "Level 3 NVQ Certificate in Wall and Floor Tiling",
              "NVQ Level 3 Diploma in Roofing Occupations",
              "Level 3 NVQ Diploma in Plastering"
            ]
          }
        ]
      }
    ]
  },
  "cscs-plumbing-mock-test": {
    exam: {
      questions: 50,
      passMark: 90,
      minutes: 60
    },
    lead: "This CSCS online mock test is for aspiring plumbers applying for operative-level JIB-PMES CSCS Registration cards (Blue or Gold). The CSCS Plumbing Test consists of {questions} MCQs; you must correctly answer at least {passCount} questions ({passMark}%) to pass the test. The time for the test is {duration}.",
    mockHeading: "CSCS Plumbing Mock Test 1",
    tests: [
      {
        slug: "cscs-plumbing-mock-test-1",
        title: "CSCS Plumbing Mock Test 1"
      }
    ],
    more: [
      "cscs-green-card-mock-test"
    ],
    sections: [
      {
        id: "cscs-jib-plumbing-cscs-mock-test-online",
        heading: "CSCS JIB Plumbing CSCS Mock Test Online",
        blocks: [
          {
            type: "p",
            text: "The CSCS Plumbing Mock Test is for individuals working in the construction industry and looking to get the Blue or Gold (Plumber) JIB CSCS card to begin working as plumbers. Our free CSCS Plumbing Mock Test will help you prepare for your actual JIB-PMES online Health, Safety and Environment (HS&E) Test. This CSCS mock test online is designed specifically for those within the Plumbing and Mechanical Engineer Services (PMES) sector."
          },
          {
            type: "p",
            text: "Our JIB Plumbing Mock Test is designed to help you assess your knowledge in preparation for the real plumbing exam. The questions in the plumbing CSCS online mock test are created with real exam questions in mind, making it a valuable tool for exam preparation."
          },
          {
            type: "p",
            text: "Upon passing the real JIB-PMES online Health, Safety and Environment (HS&E) Test, you can apply for the Blue or Gold JIB plumbing card. These JIB CSCS cards' requirements are somewhat similar to CSCS Blue Card and CSCS Gold Card."
          }
        ]
      },
      {
        id: "topics-covered-in-the-jib-cscs-card-plumbing-mock-test",
        heading: "Topics Covered in the JIB CSCS Card Plumbing Mock Test",
        blocks: [
          {
            type: "ul",
            items: [
              "Health and Safety Legislation",
              "Personal Protective Equipment (PPE)",
              "Hazard Identification and Risk Assessment",
              "Safe Working Practices",
              "Environmental Awareness",
              "Emergency Procedures",
              "Tools and Equipment Safety",
              "Communication and Reporting",
              "Health and Well-being",
              "Site-specific Practices"
            ]
          }
        ]
      },
      {
        id: "cost-of-an-nvq-level-2-and-3",
        heading: "Cost of an NVQ Level 2 and 3",
        blocks: [
          {
            type: "p",
            text: "ReadTraining Learning offers many NVQ Level 2 and 3 courses, and their fee ranges from approximately £550 to £850, including VAT. Check our NVQ Level 3 or 4 courses here."
          }
        ]
      },
      {
        id: "how-much-does-the-cscs-plumbing-test-cost",
        heading: "How Much Does the CSCS Plumbing Test Cost?",
        blocks: [
          {
            type: "p",
            text: "The test fee for a JIB-PMES HS&E test for PMES Operatives is £30.00."
          }
        ]
      },
      {
        id: "test-pass-marks-for-the-cscs-online-mock-test-for-plumbing",
        heading: "Test Pass Marks for the CSCS Online Mock Test for Plumbing",
        blocks: [
          {
            type: "p",
            text: "You must correctly answer 45 MCQs out of 50 to meet the passing criteria for the JIB-PMES HS&E test, which is 90%."
          }
        ]
      },
      {
        id: "what-training-and-qualifications-do-i-need-to-become-a-plumber",
        heading: "What Training and Qualifications Do I Need to Become a Plumber?",
        blocks: [
          {
            type: "p",
            text: "You must get a JIB-PMES CSCS Blue Card or Gold Card to take up a plumbing role, and for that, you must pass a construction-related Level 2 or 3 NVQ Diploma/NVQ Level 2 or 3."
          },
          {
            type: "p",
            text: "We offer various NVQs at Levels 2 & 3 that provide access to the IB-PMES CSCS Blue Card and Gold Card. Check our courses here."
          }
        ]
      },
      {
        id: "which-jib-pmes-cscs-registration-card-do-i-need-to-become-a-plumber",
        heading: "Which JIB-PMES CSCS Registration Card Do I Need to Become a Plumber?",
        blocks: [
          {
            type: "p",
            text: "After completing the apprenticeship or the training, an individual becomes qualified and is eligible to upgrade to a JIB-PMES CSCS Blue Card and a Gold Card."
          }
        ]
      },
      {
        id: "how-to-get-a-jib-pmes-cscs-blue-card",
        heading: "How to Get a JIB-PMES CSCS Blue Card?",
        blocks: [
          {
            type: "p",
            text: "To get a JIB-PMES CSCS Gold Card, you must fulfil the following requirements:"
          },
          {
            type: "ul",
            items: [
              "Pass a relevant construction-related Level 2 NVQ Diploma/NVQ Level 2.",
              "Pass the JIB-PMES online Health, Safety and Environment (HS&E) Test for PMES Operatives",
              "Submit an online application."
            ]
          }
        ]
      },
      {
        id: "how-to-get-a-jib-pmes-cscs-gold-card",
        heading: "How to Get a JIB-PMES CSCS Gold Card?",
        blocks: [
          {
            type: "p",
            text: "To get a JIB-PMES CSCS Gold Card, you must fulfil the following requirements:"
          },
          {
            type: "ul",
            items: [
              "Pass a relevant construction-related Level 3 NVQ Diploma/NVQ Level 3.",
              "Pass the JIB-PMES online Health, Safety and Environment (HS&E) Test for PMES Operatives",
              "Submit an online application."
            ]
          },
          {
            type: "p",
            text: "If you need more information, you can contact JIB-PMES on 01480 476925 between 10 am - 12 pm and then from 2 pm - 4 pm daily. You can also send an email to info@jib-pmes.org.uk."
          }
        ]
      },
      {
        id: "courses-for-cscs-cards",
        heading: "Courses for CSCS Cards",
        blocks: [
          {
            type: "p",
            text: "If you want to get CSCS cards like the CSCS Blue Card or CSCS Black Card, check out the following relevant courses."
          },
          {
            type: "p",
            text: "CSCS Blue Card"
          },
          {
            type: "ul",
            items: [
              "NVQ Level 2 Diploma in Plastering",
              "Level 2 NVQ Diploma in Roofing Occupations (Construction)",
              "Level 2 Diploma in Decorative Finishing and Industrial Paint",
              "Level 2 NVQ Certificate in Wall and Floor Tiling"
            ]
          },
          {
            type: "p",
            text: "CSCS Black Card"
          },
          {
            type: "ul",
            items: [
              "Level 6 NVQ Diploma in Construction Site Management",
              "Level 6 NVQ Diploma in Construction Contracting Operations Management"
            ]
          },
          {
            type: "p",
            text: "CSCS Gold Card"
          },
          {
            type: "p",
            text: "Level 4 NVQ Diploma in Construction Site Supervision (Building and Civil Engineering) Level 3 NVQ Certificate in Wall and Floor Tiling NVQ Level 3 Diploma in Roofing Occupations Level 3 NVQ Diploma in Plastering"
          }
        ]
      }
    ]
  }
};
