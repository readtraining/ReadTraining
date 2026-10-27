// Sample courses for a DEVELOPMENT or test database, so the public catalogue, the course pages, the provider workspace and the
// admin's approvals have real-looking records before providers type in their own (Milestone 2). It adds three sample providers
// ("… (sample)", no logins), their venues, five shared course pages written as the team would, the providers' courses on them
// (classroom, live online, self-paced) with dates over the next ten weeks, three courses with their own page, one course waiting
// for approval and one draft. Images are the template's sample pictures. Never part of the migrations. On the live project it
// runs only with --live-review (the client's review of Milestone 2, decided 27 October 2026): then it adds just the ten popular
// shared course pages and their providers' courses, no extra, waiting or draft examples. Remove them before a public launch.
//
//   pnpm --filter @readtraining/api seed:courses            add them (once; it stops if they are already there)
//   pnpm --filter @readtraining/api seed:courses --remove   remove everything it added
//   pnpm live --filter @readtraining/api seed:courses --live-review   the review set on the live project (--remove takes it out)
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { categories, cohorts, courseExams, courseFaqs, courseImages, courses, courseUnits, eq, inArray, organisations, sql, subcategories, topics, venues } from '@readtraining/db'

import { db } from '../lib/db.mjs'
import { COURSE_MEDIA } from '../lib/media.mjs'
import { supabase } from '../lib/supabase.mjs'

const env = process.env
const live = !env.DATABASE_URL || env.DATABASE_URL === env.LIVE_DATABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL === env.LIVE_SUPABASE_URL || /readtraining-live/.test(env.DATABASE_URL) || env.VERCEL_ENV === 'production'
const review = process.argv.includes('--live-review')
if (live && !review && !process.argv.includes('--remove')) {
  console.error('seed:courses is for development and test databases only. For the client review on live, add --live-review.')
  process.exit(1)
}
if (live) console.log('LIVE project: sample courses for the review (remove them before a public launch with --remove).')
if (!supabase) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed in .env (the sample pictures are uploaded).')
  process.exit(1)
}

const PROVIDERS = [
  { slug: 'harbour-training-group-sample', name: 'Harbour Training Group (sample)', headline: 'Security and first aid training across the North West', city: 'Manchester' },
  { slug: 'kestrel-safety-training-sample', name: 'Kestrel Safety Training (sample)', headline: 'Construction and health and safety courses in the Midlands and London', city: 'Birmingham' },
  { slug: 'apex-skills-academy-sample', name: 'Apex Skills Academy (sample)', headline: 'Hospitality, business and online learning', city: 'London' },
]
const SHARED_SLUGS = ['sia-door-supervisor', 'emergency-first-aid-at-work', 'cscs-green-card', 'iosh-managing-safely', 'level-2-food-hygiene', 'sia-door-supervisor-top-up', 'sia-cctv-operator', 'citb-smsts', 'citb-sssts', 'personal-licence-aplh']

const remove = process.argv.includes('--remove')
const provRows = await db.select({ id: organisations.id }).from(organisations).where(inArray(organisations.slug, PROVIDERS.map((p) => p.slug)))
// every stored file under a folder of the course pictures (each course has its own folder)
async function filesUnder(folder: string) {
  const out: string[] = []
  const { data } = await supabase!.storage.from(COURSE_MEDIA).list(folder, { limit: 1000 })
  for (const f of data ?? []) {
    if (f.id) out.push(`${folder}/${f.name}`)
    else out.push(...(await filesUnder(`${folder}/${f.name}`)))
  }
  return out
}
if (remove) {
  const orgIds = provRows.map((p) => p.id)
  // the sample providers' own courses first (rows, then their pictures), so the shared pages are free to go
  if (orgIds.length) await db.delete(courses).where(inArray(courses.organisationId, orgIds))
  for (const o of orgIds) {
    const files = await filesUnder(`${o}/courses`)
    if (files.length) await supabase.storage.from(COURSE_MEDIA).remove(files)
  }
  // a sample shared page that someone else's course now sits on is kept (with its picture); the others go
  const pages = await db.select({ id: courses.id, slug: courses.slug }).from(courses).where(sql`${courses.slug} in ${SHARED_SLUGS} and ${courses.kind} = 'shared'`)
  const kept: string[] = []
  for (const p of pages) {
    const [used] = await db.select({ n: sql<number>`count(*)::int` }).from(courses).where(eq(courses.parentId, p.id))
    if (used.n) {
      kept.push(`${p.slug} (${used.n} other course${used.n === 1 ? '' : 's'} on it)`)
      continue
    }
    await db.delete(courses).where(eq(courses.id, p.id))
    const files = await filesUnder(`shared/courses/${p.id}`)
    if (files.length) await supabase.storage.from(COURSE_MEDIA).remove(files)
  }
  if (orgIds.length) {
    await db.delete(venues).where(inArray(venues.organisationId, orgIds))
    await db.delete(organisations).where(inArray(organisations.id, orgIds))
  }
  console.log(`Removed the sample providers, their courses and ${pages.length - kept.length} shared course pages.${kept.length ? ` Kept: ${kept.join(', ')}.` : ''}`)
  process.exit(0)
}
if (provRows.length) {
  console.log('The sample courses are already there. Run with --remove first to add them again.')
  process.exit(0)
}

// ---- catalogue places ---------------------------------------------------------------------------------------------------
const place = async (cat: string, sub: string, topic?: string) => {
  const [c] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, cat))
  const [s] = c ? await db.select({ id: subcategories.id }).from(subcategories).where(sql`${subcategories.slug} = ${sub} and ${subcategories.categoryId} = ${c.id}`) : []
  if (!c || !s) throw new Error(`The catalogue list has no ${cat} › ${sub}. Run the catalogue migrations first.`)
  const [tp] = topic ? await db.select({ id: topics.id }).from(topics).where(sql`${topics.slug} = ${topic} and ${topics.subcategoryId} = ${s.id}`) : []
  if (topic && !tp) throw new Error(`The catalogue list has no ${cat} › ${sub} › ${topic}.`)
  return { categoryId: c.id, subcategoryId: s.id, topicId: tp?.id ?? null }
}

// ---- pictures: the template's sample cards, uploaded to the course's folder -----------------------------------------------
const here = dirname(fileURLToPath(import.meta.url))
const card = (n: number) => readFileSync(join(here, '../../../web/public/assets/img/coursesCards', `${n}.png`))
async function picture(courseId: number, folder: string, n: number, alt: string) {
  const path = `${folder}/${randomUUID()}.png`
  // three tries: a slow connection can drop one upload
  let error: { message: string } | null = null
  for (let i = 0; i < 3; i++) {
    ;({ error } = await supabase!.storage.from(COURSE_MEDIA).upload(path, card(n), { contentType: 'image/png', upsert: true }))
    if (!error) break
  }
  if (error) throw new Error(`Picture upload failed: ${error.message}`)
  await db.insert(courseImages).values({ courseId, position: 0, path, alt })
}

// ---- dates ----------------------------------------------------------------------------------------------------------------
const DAY = 86400000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
// the first weekday on or after `days` from today
const weekday = (days: number) => {
  let t = Date.now() + days * DAY
  while ([0, 6].includes(new Date(t).getUTCDay())) t += DAY
  return t
}
// a run of `len` consecutive weekdays from `start`
const run = (start: number, len: number, from = '09:30', to = '16:30') => {
  const out: { date: string; end: string; from: string; to: string }[] = []
  let t = start
  while (out.length < len) {
    if (![0, 6].includes(new Date(t).getUTCDay())) out.push({ date: iso(t), end: iso(t), from, to })
    t += DAY
  }
  return out
}

type Content = { summary: string; description: string; audience: string; entry: string; outcomes: string[]; features: string[]; units: [string, string][]; exams?: [string, string, string][]; faqs: [string, string][] }
async function writeContent(courseId: number, c: Content) {
  await db.update(courses).set({ summary: c.summary, description: c.description, audience: c.audience, entryRequirements: c.entry, outcomes: c.outcomes, features: c.features }).where(eq(courses.id, courseId))
  await db.insert(courseUnits).values(c.units.map(([title, body], i) => ({ courseId, position: i, title, body })))
  if (c.exams?.length) await db.insert(courseExams).values(c.exams.map(([unit, passMark, duration], i) => ({ courseId, position: i, unit, passMark, duration })))
  await db.insert(courseFaqs).values(c.faqs.map(([question, answer], i) => ({ courseId, position: i, question, answer })))
}

// ---- providers and venues -------------------------------------------------------------------------------------------------
const orgs: Record<string, string> = {}
for (const p of PROVIDERS) {
  const [o] = await db
    .insert(organisations)
    .values({ type: 'provider', name: p.name, slug: p.slug, status: 'active', headline: p.headline, city: p.city, bio: `${p.name.replace(' (sample)', '')} is a sample provider. Its courses show how real providers' courses look while the site is being reviewed.`, bookingTerms: 'Pay in full when you book. Your place is confirmed by email.', cancellationPolicy: 'Cancel up to 14 days before the start for a full refund. After that, you can move to another date once for free.' })
    .returning({ id: organisations.id })
  orgs[p.slug] = o.id
}
const [harbour, kestrel, apex] = PROVIDERS.map((p) => orgs[p.slug])
const venue = async (org: string, name: string, street: string, city: string, postcode: string, lat: number, lng: number) =>
  (await db.insert(venues).values({ organisationId: org, name, street, city, postcode, lat, lng }).returning({ id: venues.id }))[0].id
const V = {
  man: await venue(harbour, 'Harbour Manchester Centre', '1 Piccadilly', 'Manchester', 'M1 1AE', 53.4835, -2.2312),
  liv: await venue(harbour, 'Harbour Liverpool Rooms', '12 Hanover Street', 'Liverpool', 'L1 3DN', 53.4031, -2.9857),
  bir: await venue(kestrel, 'Kestrel Birmingham', '5 Colmore Row', 'Birmingham', 'B3 2BJ', 52.4815, -1.8992),
  ldnK: await venue(kestrel, 'Kestrel London Bridge', '20 Tooley Street', 'London', 'SE1 2PF', 51.5048, -0.0853),
  ldnA: await venue(apex, 'Apex Clerkenwell', '30 St John Street', 'London', 'EC1M 4AY', 51.5213, -0.1022),
  lds: await venue(apex, 'Apex Leeds', '8 Park Row', 'Leeds', 'LS1 5HD', 53.7987, -1.5469),
}

// ---- the shared pages ----------------------------------------------------------------------------------------------------
const SHARED: { slug: string; title: string; cat: string; sub: string; topic?: string; level: string; img: number; content: Content }[] = [
  {
    slug: 'sia-door-supervisor', title: 'SIA Door Supervisor', cat: 'security', sub: 'sia-licence-training', topic: 'door-supervisor', level: 'beginner', img: 1,
    content: {
      summary: 'The Level 2 qualification you need to apply for an SIA door supervisor licence, with first aid included.',
      description: 'This course leads to the Level 2 Award for Door Supervisors in the Private Security Industry, the qualification the SIA asks for before it issues a door supervisor licence.\n\nYou learn how the private security industry works, how to keep yourself and others safe, how to manage conflict, and how to search, detain and use physical intervention lawfully. The course includes the Emergency First Aid at Work qualification the SIA also requires.',
      audience: 'People who want to work on the doors of pubs, clubs, hotels, events and venues, and security officers who want a door supervisor licence.',
      entry: 'You must be 18 or over and bring photo ID on the first day. Your English must be good enough to follow the course and take the exams.',
      outcomes: ['Explain how the private security industry works and the laws that apply', 'Keep yourself and others safe at work', 'Reduce and manage conflict', 'Search people and property lawfully', 'Use physical intervention safely', 'Give emergency first aid'],
      features: ['Includes Emergency First Aid at Work', 'SIA licence-linked', 'Exams on the last day'],
      units: [['Principles of working in the private security industry', 'The security industry and its laws\nHealth and safety\nFire safety\nEmergencies'], ['Principles of working as a door supervisor', 'Behaviour and licensing law\nSearching\nArrest and detention\nDrugs awareness'], ['Application of conflict management', 'Recognising and reducing conflict\nCommunicating to calm a situation'], ['Application of physical intervention skills', 'Safe holds and escorts\nReducing the risk of harm']],
      exams: [['Principles of working in the private security industry', '70%', '75 minutes'], ['Principles of working as a door supervisor', '70%', '60 minutes'], ['Conflict management', '70%', '30 minutes'], ['Physical intervention (practical)', 'Pass', '45 minutes']],
      faqs: [['How long is the licence valid?', 'An SIA door supervisor licence lasts three years. You take a top-up course to renew it.'], ['Is first aid included?', 'Yes. The course includes the Emergency First Aid at Work qualification the SIA asks for.']],
    },
  },
  {
    slug: 'emergency-first-aid-at-work', title: 'Emergency First Aid at Work', cat: 'first-aid', sub: 'workplace-first-aid', topic: 'emergency-first-aid-at-work', level: 'beginner', img: 5,
    content: {
      summary: 'A one-day course that qualifies you as an emergency first aider at work, valid for three years.',
      description: 'Emergency First Aid at Work (EFAW) teaches what to do in the first minutes of an emergency at work, until help arrives.\n\nYou practise CPR on manikins, use a defibrillator, and learn to deal with bleeding, choking, burns and shock. It meets the Health and Safety Executive guidance for workplaces with lower risks.',
      audience: 'Anyone named as an emergency first aider at work, and people who need the qualification for an SIA licence.',
      entry: 'None. You need to be able to kneel on the floor to practise CPR.',
      outcomes: ['Give CPR to an adult', 'Use a defibrillator', 'Help someone who is choking', 'Control bleeding', 'Treat burns and shock', 'Put someone in the recovery position'],
      features: ['1 day', 'Valid 3 years', 'HSE guidance'],
      units: [['The role of the first aider', 'What a first aider does\nKeeping yourself safe'], ['Life support', 'CPR\nUsing a defibrillator\nRecovery position'], ['Injuries', 'Bleeding\nBurns\nShock\nMinor injuries']],
      exams: [['Practical assessment', 'Pass', 'Through the day'], ['Multiple-choice questions', '70%', '20 minutes']],
      faqs: [['Does this count for an SIA licence?', 'Yes. The SIA accepts this qualification for door supervisor and security guard licences.']],
    },
  },
  {
    slug: 'cscs-green-card', title: 'CSCS Green Card (Level 1 Health and Safety)', cat: 'construction', sub: 'cscs-cards', topic: 'labourer', level: 'beginner', img: 9,
    content: {
      summary: 'The Level 1 health and safety award you need for a CSCS Labourer (Green) card, in one day.',
      description: 'This course leads to the Level 1 Award in Health and Safety in a Construction Environment. With it, and a pass in the CITB Health, Safety and Environment test, you can apply for the CSCS Labourer card.\n\nYou learn the main risks on a building site and how to work safely.',
      audience: 'People starting work as labourers on construction sites.',
      entry: 'None. Bring photo ID.',
      outcomes: ['Spot the main hazards on a building site', 'Work safely at height and with tools', 'Know your rights and duties', 'Report accidents and near misses'],
      features: ['1 day', 'Leads to the CSCS Green Card'],
      units: [['Health and safety on site', 'The law\nRisk assessments\nAccidents and reporting'], ['Common hazards', 'Working at height\nManual handling\nNoise and dust']],
      exams: [['Multiple-choice paper', '80%', '30 minutes']],
      faqs: [['Do I also need the HS&E test?', 'Yes. CSCS asks for this award and a pass in the CITB Health, Safety and Environment test.']],
    },
  },
  {
    slug: 'iosh-managing-safely', title: 'IOSH Managing Safely', cat: 'health-and-safety', sub: 'iosh-and-nebosh', topic: 'iosh-managing-safely', level: 'intermediate', img: 3,
    content: {
      summary: 'The leading health and safety certificate for managers and supervisors, over four days or live online.',
      description: 'IOSH Managing Safely gives managers what they need to handle health and safety in their team: assessing risks, controlling them, investigating incidents and measuring how well things work.\n\nThe course ends with a short exam and a workplace risk assessment project.',
      audience: 'Managers and supervisors in any sector.',
      entry: 'None.',
      outcomes: ['Assess and control risks', 'Understand your legal responsibilities', 'Investigate incidents', 'Measure health and safety performance'],
      features: ['4 days', 'IOSH certificate'],
      units: [['Introducing managing safely', ''], ['Assessing risks', ''], ['Controlling risks', ''], ['Understanding your responsibilities', ''], ['Understanding hazards', ''], ['Investigating incidents', ''], ['Measuring performance', '']],
      exams: [['Multiple-choice and short-answer exam', '60%', '45 minutes'], ['Risk assessment project', 'Pass', 'Two weeks after the course']],
      faqs: [['Does the certificate expire?', 'No, but IOSH recommends a refresher every three years.']],
    },
  },
  {
    slug: 'level-2-food-hygiene', title: 'Level 2 Food Hygiene and Safety', cat: 'hospitality', sub: 'food-safety', topic: 'level-2-food-hygiene', level: 'beginner', img: 8,
    content: {
      summary: 'Food hygiene for anyone who handles food at work, online at your own pace.',
      description: 'This online course covers the food safety knowledge expected of food handlers in catering, retail and manufacturing.\n\nWork through it at your own pace and take the test online when you are ready.',
      audience: 'Food handlers in kitchens, cafés, shops and factories.',
      entry: 'None.',
      outcomes: ['Keep food safe from contamination', 'Store and cook food at safe temperatures', 'Keep yourself and your workplace clean', 'Know the law on food safety'],
      features: ['Self-paced', 'Certificate on completion'],
      units: [['Food safety law', ''], ['Contamination and how to stop it', ''], ['Temperature control', ''], ['Cleaning and personal hygiene', '']],
      exams: [['Online multiple-choice test', '75%', '30 minutes']],
      faqs: [['How long do I have?', 'You can take as long as you need. Most learners finish in about three hours.']],
    },
  },
  // the courses with a mock test on the site (data/testPrep.js mockTestCourses picks them by topic)
  {
    slug: 'sia-door-supervisor-top-up', title: 'SIA Door Supervisor Top-Up', cat: 'security', sub: 'sia-top-up', topic: 'door-supervisor-top-up', level: 'beginner', img: 2,
    content: {
      summary: 'The refresher training you need before you renew an SIA door supervisor licence.',
      description: 'Door supervisors renewing their licence must complete top-up training first.\n\nThe course refreshes the law and good practice, covers terror threats and how to respond to them, and updates your physical intervention skills. You also need a valid first aid certificate.',
      audience: 'Licensed door supervisors whose licence is due for renewal.',
      entry: 'A current or recently expired SIA door supervisor licence, photo ID and a valid Emergency First Aid at Work certificate.',
      outcomes: ['Apply the current law in your role', 'Recognise and respond to terror threats', 'Use physical intervention safely', 'Keep yourself and the public safe'],
      features: ['Licence renewal', 'Physical intervention included'],
      units: [['Principles of terror threat awareness', 'Threat levels\nSpotting hostile planning\nWhat to do'], ['Physical intervention refresher', 'Safe holds and escorts\nReducing the risk of harm']],
      exams: [['Multiple-choice paper', '70%', '30 minutes'], ['Physical intervention (practical)', 'Pass', '45 minutes']],
      faqs: [['Do I need a first aid certificate?', 'Yes. You need a valid Emergency First Aid at Work certificate before you can take the top-up.']],
    },
  },
  {
    slug: 'sia-cctv-operator', title: 'SIA CCTV Operator (Public Space Surveillance)', cat: 'security', sub: 'sia-licence-training', topic: 'cctv-operator', level: 'beginner', img: 10,
    content: {
      summary: 'The Level 2 qualification you need for an SIA public space surveillance (CCTV) licence.',
      description: 'This course leads to the Level 2 Award for CCTV Operators (Public Space Surveillance), the qualification the SIA asks for before it issues a CCTV licence.\n\nYou learn how CCTV control rooms work, the laws on surveillance and privacy, and how to operate cameras and record incidents properly.',
      audience: 'People who want to work in CCTV control rooms for councils, shopping centres, transport hubs and venues.',
      entry: 'You must be 18 or over and bring photo ID on the first day.',
      outcomes: ['Explain how the private security industry works', 'Use CCTV equipment correctly', 'Follow the law on surveillance and personal data', 'Record and report incidents', 'Work with the police and other services'],
      features: ['SIA licence-linked', 'Practical assessment'],
      units: [['Principles of working in the private security industry', ''], ['Principles and practices of working as a CCTV operator', ''], ['Practical operation of CCTV equipment', '']],
      exams: [['Principles of working in the private security industry', '70%', '75 minutes'], ['Working as a CCTV operator', '70%', '60 minutes'], ['Practical CCTV assessment', 'Pass', '30 minutes']],
      faqs: [['How long is the licence valid?', 'An SIA CCTV licence lasts three years.']],
    },
  },
  {
    slug: 'citb-smsts', title: 'CITB Site Management Safety Training Scheme (SMSTS)', cat: 'construction', sub: 'site-safety', topic: 'citb-smsts', level: 'advanced', img: 12,
    content: {
      summary: 'The five-day CITB course for site managers who plan, organise and control construction work safely.',
      description: 'SMSTS covers the law and good practice a site manager needs to run a safe site.\n\nIt includes risk assessments, method statements, the Construction (Design and Management) Regulations and how to lead a site team safely, with an exam on the last day.',
      audience: 'Site managers, project managers, supervisors moving into management, and construction business owners.',
      entry: 'None, but you should already work in a supervisory role on site. Bring photo ID.',
      outcomes: ['Apply the main construction health and safety law', 'Write and check risk assessments and method statements', 'Plan safe work on site', 'Lead and monitor your site team'],
      features: ['5 days', 'CITB certificate valid 5 years'],
      units: [['Health and safety law', ''], ['Managing risk', ''], ['The CDM Regulations', ''], ['Site hazards and controls', ''], ['Leading a safe site', '']],
      exams: [['Multiple-choice and short-answer exam', 'Set by CITB', 'On the last day']],
      faqs: [['How long is SMSTS valid?', 'Five years. You take a two-day refresher before it runs out.']],
    },
  },
  {
    slug: 'citb-sssts', title: 'CITB Site Supervisor Safety Training Scheme (SSSTS)', cat: 'construction', sub: 'site-safety', topic: 'citb-sssts', level: 'intermediate', img: 11,
    content: {
      summary: 'The two-day CITB course for supervisors who look after safety on site.',
      description: 'SSSTS gives supervisors the knowledge to work safely and keep their team safe.\n\nYou learn the law, how to spot and control hazards and how to brief your team, with an exam at the end of the second day.',
      audience: 'Supervisors, foremen and team leaders on construction sites.',
      entry: 'None. Bring photo ID.',
      outcomes: ['Understand your duties as a supervisor', 'Spot and control common site hazards', 'Run toolbox talks', 'Check that work is done safely'],
      features: ['2 days', 'CITB certificate valid 5 years'],
      units: [['Legal duties', ''], ['Hazards on site', ''], ['Briefing your team', '']],
      exams: [['Multiple-choice exam', 'Set by CITB', 'End of day 2']],
      faqs: [['How long is SSSTS valid?', 'Five years, then a one-day refresher.']],
    },
  },
  {
    slug: 'personal-licence-aplh', title: 'Personal Licence (Level 2 Award for Personal Licence Holders)', cat: 'hospitality', sub: 'licensing', topic: 'aplh', level: 'beginner', img: 7,
    content: {
      summary: 'The one-day qualification that is the first step to a personal licence to sell alcohol.',
      description: 'In England and Wales you need a personal licence to authorise the sale of alcohol, and this qualification is the first step.\n\nYou learn the Licensing Act, the licensing objectives, the duties of a licence holder and the rules on selling to children. After passing, you apply to your local council.',
      audience: 'Pub, bar, shop and restaurant managers, and anyone who will authorise alcohol sales.',
      entry: 'You must be 18 or over and bring photo ID.',
      outcomes: ['Explain the four licensing objectives', 'Know the duties of a personal licence holder', 'Refuse sales to children and drunk customers', 'Know the penalties for breaking the law'],
      features: ['1 day', 'Exam on the day'],
      units: [['Licensing law and the objectives', ''], ['Duties of a licence holder', ''], ['Protecting children and the public', '']],
      exams: [['Multiple-choice exam', '28 of 40', '40 minutes']],
      faqs: [['What happens after I pass?', 'You apply to your local council with your certificate, a basic criminal record check and photos.']],
    },
  },
]
const sharedIds: Record<string, number> = {}
for (const s of SHARED) {
  const [kept] = await db.select({ id: courses.id }).from(courses).where(sql`${courses.slug} = ${s.slug} and ${courses.kind} = 'shared'`)
  if (kept) {
    // a page --remove kept (someone else's course sits on it): reuse it, and give it its picture back if the file is gone
    sharedIds[s.slug] = kept.id
    const imgs = await db.select({ id: courseImages.id, path: courseImages.path }).from(courseImages).where(eq(courseImages.courseId, kept.id))
    const present = new Set(await filesUnder(`shared/courses/${kept.id}`))
    const gone = imgs.filter((i) => !present.has(i.path))
    if (gone.length) await db.delete(courseImages).where(inArray(courseImages.id, gone.map((i) => i.id)))
    if (imgs.length === gone.length) await picture(kept.id, `shared/courses/${kept.id}`, s.img, s.title)
    continue
  }
  const [c] = await db
    .insert(courses)
    .values({ kind: 'shared', slug: s.slug, title: s.title, ...(await place(s.cat, s.sub, s.topic)), level: s.level, status: 'live', publishedAt: new Date(Date.now() - 30 * DAY), seoTitle: `${s.title} course`, seoDescription: s.content.summary })
    .returning({ id: courses.id })
  sharedIds[s.slug] = c.id
  await writeContent(c.id, s.content)
  await picture(c.id, `shared/courses/${c.id}`, s.img, s.title)
}

// ---- providers' courses --------------------------------------------------------------------------------------------------
type Offer = { org: string; title: string; slug: string; shared?: string; cat: string; sub: string; topic?: string; level: string; method: 'classroom' | 'live-online' | 'self-paced'; img: number; status?: 'live' | 'pending' | 'draft'; price?: number; dates?: { start: number; len: number; venue?: string; price: number; was?: number; cap?: number }[]; content?: Content; skillSaver?: boolean }
const sharedContent = (slug: string) => SHARED.find((s) => s.slug === slug)!.content
const OFFERS: Offer[] = [
  { org: harbour, title: 'SIA Door Supervisor (Manchester and Liverpool)', slug: 'harbour-sia-door-supervisor', shared: 'sia-door-supervisor', cat: 'security', sub: 'sia-licence-training', topic: 'door-supervisor', level: 'beginner', method: 'classroom', img: 1, skillSaver: true, dates: [{ start: 7, len: 6, venue: V.man, price: 19900, was: 24900 }, { start: 21, len: 6, venue: V.liv, price: 18900 }, { start: 42, len: 6, venue: V.man, price: 19900 }] },
  { org: kestrel, title: 'SIA Door Supervisor (Birmingham and London)', slug: 'kestrel-sia-door-supervisor', shared: 'sia-door-supervisor', cat: 'security', sub: 'sia-licence-training', topic: 'door-supervisor', level: 'beginner', method: 'classroom', img: 2, dates: [{ start: 10, len: 6, venue: V.bir, price: 20900 }, { start: 28, len: 6, venue: V.ldnK, price: 22900 }] },
  { org: harbour, title: 'Emergency First Aid at Work', slug: 'harbour-emergency-first-aid-at-work', shared: 'emergency-first-aid-at-work', cat: 'first-aid', sub: 'workplace-first-aid', topic: 'emergency-first-aid-at-work', level: 'beginner', method: 'classroom', img: 5, dates: [{ start: 5, len: 1, venue: V.man, price: 7900, was: 9500 }, { start: 12, len: 1, venue: V.liv, price: 7500 }, { start: 26, len: 1, venue: V.man, price: 7900 }] },
  { org: apex, title: 'Emergency First Aid at Work (live online)', slug: 'apex-emergency-first-aid-at-work-online', shared: 'emergency-first-aid-at-work', cat: 'first-aid', sub: 'workplace-first-aid', topic: 'emergency-first-aid-at-work', level: 'beginner', method: 'live-online', img: 6, dates: [{ start: 8, len: 1, price: 6900 }, { start: 22, len: 1, price: 6900 }] },
  { org: kestrel, title: 'CSCS Green Card course', slug: 'kestrel-cscs-green-card', shared: 'cscs-green-card', cat: 'construction', sub: 'cscs-cards', topic: 'labourer', level: 'beginner', method: 'classroom', img: 9, dates: [{ start: 6, len: 1, venue: V.bir, price: 9900 }, { start: 13, len: 1, venue: V.ldnK, price: 10900 }, { start: 34, len: 1, venue: V.bir, price: 9900 }] },
  { org: kestrel, title: 'IOSH Managing Safely', slug: 'kestrel-iosh-managing-safely', shared: 'iosh-managing-safely', cat: 'health-and-safety', sub: 'iosh-and-nebosh', topic: 'iosh-managing-safely', level: 'intermediate', method: 'classroom', img: 3, dates: [{ start: 14, len: 4, venue: V.bir, price: 49500, was: 54500 }, { start: 49, len: 4, venue: V.ldnK, price: 52500 }] },
  { org: apex, title: 'IOSH Managing Safely (live online)', slug: 'apex-iosh-managing-safely-online', shared: 'iosh-managing-safely', cat: 'health-and-safety', sub: 'iosh-and-nebosh', topic: 'iosh-managing-safely', level: 'intermediate', method: 'live-online', img: 4, dates: [{ start: 9, len: 4, price: 44900 }] },
  { org: apex, title: 'Level 2 Food Hygiene and Safety (online)', slug: 'apex-level-2-food-hygiene', shared: 'level-2-food-hygiene', cat: 'hospitality', sub: 'food-safety', topic: 'level-2-food-hygiene', level: 'beginner', method: 'self-paced', img: 8, price: 1999 },
  { org: harbour, title: 'SIA Door Supervisor Top-Up', slug: 'harbour-sia-door-supervisor-top-up', shared: 'sia-door-supervisor-top-up', cat: 'security', sub: 'sia-top-up', topic: 'door-supervisor-top-up', level: 'beginner', method: 'classroom', img: 2, dates: [{ start: 9, len: 1, venue: V.man, price: 14900 }, { start: 30, len: 1, venue: V.liv, price: 13900 }] },
  { org: harbour, title: 'SIA CCTV Operator', slug: 'harbour-sia-cctv-operator', shared: 'sia-cctv-operator', cat: 'security', sub: 'sia-licence-training', topic: 'cctv-operator', level: 'beginner', method: 'classroom', img: 10, dates: [{ start: 16, len: 4, venue: V.man, price: 19900 }, { start: 44, len: 4, venue: V.liv, price: 19900 }] },
  { org: kestrel, title: 'CITB SMSTS', slug: 'kestrel-citb-smsts', shared: 'citb-smsts', cat: 'construction', sub: 'site-safety', topic: 'citb-smsts', level: 'advanced', method: 'classroom', img: 12, dates: [{ start: 20, len: 5, venue: V.bir, price: 54900 }, { start: 41, len: 5, venue: V.ldnK, price: 57900 }] },
  { org: kestrel, title: 'CITB SSSTS', slug: 'kestrel-citb-sssts', shared: 'citb-sssts', cat: 'construction', sub: 'site-safety', topic: 'citb-sssts', level: 'intermediate', method: 'classroom', img: 11, dates: [{ start: 11, len: 2, venue: V.bir, price: 27900 }, { start: 32, len: 2, venue: V.ldnK, price: 29900 }] },
  { org: apex, title: 'Personal Licence (APLH)', slug: 'apex-personal-licence-aplh', shared: 'personal-licence-aplh', cat: 'hospitality', sub: 'licensing', topic: 'aplh', level: 'beginner', method: 'classroom', img: 7, dates: [{ start: 7, len: 1, venue: V.ldnA, price: 12900 }, { start: 24, len: 1, venue: V.lds, price: 11900 }] },
  // with their own page
  { org: apex, title: 'Barista Skills Masterclass', slug: 'barista-skills-masterclass', cat: 'hospitality', sub: 'barista-and-coffee', level: 'beginner', method: 'classroom', img: 11, dates: [{ start: 11, len: 1, venue: V.ldnA, price: 13500 }, { start: 25, len: 1, venue: V.lds, price: 12500 }], content: { summary: 'Hands-on espresso, milk texturing and latte art in one day.', description: 'Learn to pull a great espresso, steam milk properly and pour latte art, on commercial machines, in small groups.', audience: 'New baristas, café owners and coffee lovers.', entry: 'None.', outcomes: ['Dial in an espresso', 'Texture milk for different drinks', 'Pour a heart and a rosetta', 'Keep the machine clean'], features: ['1 day', 'Small groups'], units: [['Espresso', 'Grind, dose and extraction'], ['Milk', 'Steaming and texture'], ['Latte art', 'Hearts, tulips and rosettas']], faqs: [['Do I need my own equipment?', 'No. Everything is provided.']] } },
  { org: apex, title: 'Digital Marketing Essentials', slug: 'digital-marketing-essentials-live', cat: 'marketing', sub: 'digital-marketing', level: 'beginner', method: 'live-online', img: 12, dates: [{ start: 15, len: 2, price: 24900, was: 29900 }], content: { summary: 'Search, social media and email marketing for beginners, live online over two days.', description: 'A practical introduction to the main digital marketing channels, with a plan you can use straight away.', audience: 'Small business owners and new marketing assistants.', entry: 'None.', outcomes: ['Plan a simple digital marketing campaign', 'Improve how your site shows in search', 'Use social media to reach customers', 'Measure what works'], features: ['2 days', 'Live online'], units: [['Planning', ''], ['Search', ''], ['Social media', ''], ['Email and measuring', '']], faqs: [['What do I need?', 'A computer with a camera and a good internet connection.']] } },
  { org: harbour, title: 'Conflict Management for Security Staff', slug: 'conflict-management-for-security-staff', cat: 'security', sub: 'conflict-management', level: 'beginner', method: 'self-paced', img: 7, price: 3900, content: { summary: 'Reduce risk and calm confrontation in front-line security roles, online at your own pace.', description: 'An online course on recognising, reducing and managing conflict at work.', audience: 'Security officers, door supervisors and front-line staff.', entry: 'None.', outcomes: ['Recognise the signs of conflict', 'Calm a situation with words', 'Keep a safe distance', 'Report incidents'], features: ['Self-paced', 'About 3 hours'], units: [['Understanding conflict', ''], ['Reducing conflict', ''], ['After an incident', '']], faqs: [['Is this the SIA conflict unit?', 'No. It is a refresher, not part of an SIA licence qualification.']] } },
  // for the admin's approvals and the provider workspace
  { org: kestrel, title: 'Asbestos Awareness (Category A)', slug: 'kestrel-asbestos-awareness', cat: 'construction', sub: 'site-safety', topic: 'asbestos-awareness', level: 'beginner', method: 'classroom', img: 10, status: 'pending', dates: [{ start: 18, len: 1, venue: V.bir, price: 5900 }], content: { summary: 'Spot materials that may contain asbestos and avoid disturbing them.', description: 'A half-day awareness course for anyone who could come across asbestos at work.', audience: 'Tradespeople and maintenance staff.', entry: 'None.', outcomes: ['Know where asbestos may be found', 'Understand the health risks', 'Know what to do if you find it', 'Follow the law'], features: ['Half a day'], units: [['What asbestos is', ''], ['Where it is found', ''], ['What to do', '']], faqs: [['Is this enough to remove asbestos?', 'No. Removal needs a licensed contractor.']] } },
  { org: harbour, title: 'Paediatric First Aid (draft)', slug: 'harbour-paediatric-first-aid', cat: 'first-aid', sub: 'paediatric-first-aid', level: 'intermediate', method: 'classroom', img: 4, status: 'draft' },
]
// the live review gets only the providers' live courses on the ten shared pages (no extra, waiting or draft examples)
const ADD = review ? OFFERS.filter((o) => o.shared && (o.status ?? 'live') === 'live') : OFFERS
for (const o of ADD) {
  const status = o.status ?? 'live'
  const [c] = await db
    .insert(courses)
    .values({ kind: 'provider', organisationId: o.org, parentId: o.shared ? sharedIds[o.shared] : null, slug: o.slug, title: o.title, ...(await place(o.cat, o.sub, o.topic)), level: o.level, method: o.method, pricePence: o.price ?? null, skillSaver: o.skillSaver ?? false, status, submittedAt: status === 'draft' ? null : new Date(Date.now() - 3 * DAY), publishedAt: status === 'live' ? new Date(Date.now() - 20 * DAY) : null, decidedAt: status === 'live' ? new Date(Date.now() - 20 * DAY) : null })
    .returning({ id: courses.id })
  if (status !== 'draft') await writeContent(c.id, o.content ?? sharedContent(o.shared!))
  await picture(c.id, `${o.org}/courses/${c.id}`, o.img, o.title)
  for (const d of o.dates ?? []) {
    const sessions = run(weekday(d.start), d.len, o.method === 'live-online' ? '10:00' : '09:30', o.method === 'live-online' ? '16:00' : '16:30')
    await db.insert(cohorts).values({ courseId: c.id, method: o.method, venueId: d.venue ?? null, joinUrl: o.method === 'live-online' ? 'https://zoom.us/j/0000000000' : null, sessions, startsOn: sessions[0].date, endsOn: sessions[sessions.length - 1].end, capacity: d.cap ?? 12, pricePence: d.price, wasPricePence: d.was ?? null })
  }
}
console.log(`Added ${PROVIDERS.length} sample providers, ${SHARED.length} shared course pages and ${ADD.length} providers' courses.`)
process.exit(0)
