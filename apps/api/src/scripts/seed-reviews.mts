// Our imported customer reviews in the `reviews` table (admin › Customer reviews): five from Google and the 5-star ones from
// Trustpilot (data/trustpilot-reviews.json). All real reviews of Read Training, copied word for word.
//
// Google: five reviews copied word for word from Read Training's Google listing on 2 November 2026 (only the star emoji at the start of Malik's
// is left out: the site shows each reviewer's stars); the client gave permission to use them. Google showed only how old each
// was ("3 weeks ago"), so they have no date (never worked out from that). A review names a course topic only when its text
// clearly names the course (Tanzila's names the Door Supervisor course); the others are about us in general.
//
// Trustpilot: the 198 5-star reviews of Read Training its public pages showed on 2 November 2026 (uk.trustpilot.com/review/
// readtraining.co.uk; Trustpilot shows only the latest 200 of a filter without signing in, so older ones need the client's
// Trustpilot business export). Each keeps its own date (the day it was posted) and its link on Trustpilot. The title is the
// first line unless the text already starts with it. A review names a course topic only when its words clearly name the
// course; when it names several, the first one named.
//
//   pnpm --filter @readtraining/api seed:reviews            add them (a review already there is brought up to date)
//   pnpm --filter @readtraining/api seed:reviews --remove   take them out again
//
// Not part of the migrations. On the live project it refuses to run unless --live is added, and that is only ever done after
// asking first: pnpm live --filter @readtraining/api seed:reviews --live
import { readFileSync } from 'node:fs'

import { and, eq, reviews } from '@readtraining/db'

import { db } from '../lib/db.mjs'

const env = process.env
const live = !env.DATABASE_URL || env.DATABASE_URL === env.LIVE_DATABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL === env.LIVE_SUPABASE_URL || /readtraining-live/.test(env.DATABASE_URL) || env.VERCEL_ENV === 'production'
if (live && !process.argv.includes('--live')) {
  console.error('seed:reviews would write to the LIVE project. Ask first, then run it again with --live.')
  process.exit(1)
}
const remove = process.argv.includes('--remove')
const ORIGIN = { origin: 'Google', originUrl: 'https://www.google.com/maps?cid=8524470252183802666' }

const REVIEWS = [
  { name: 'Malik Umergadola', topic: null, home: true, text: 'Excellent SIA Security Training!\nI had a great experience with READ Training UK. The trainers were professional, knowledgeable, and explained everything clearly. The course was well organised, and the staff were friendly and supportive throughout. The mock tests and practical sessions really helped me prepare for the exam. I would highly recommend READ Training to anyone looking to obtain their SIA licence. Thank you for the excellent training!' },
  { name: 'Tanzila Hossen', topic: 'security/sia-licence-training/door-supervisor', home: true, text: 'I had a really good experience with this training center while completing my "Door Supervisor course". The environment was comfortable, safe & very suitable for female learners. Everyone was friendly, respectful & supportive. The trainer was especially amazing. He was very polite & always helped us whenever we needed support. His way of teaching made the learning process easier & more enjoyable.Overall I am very satisfied with the training center & would definitely recommend it to others.' },
  { name: 'Damanpreet Kaur', topic: null, home: true, text: 'I had a great experience at Read Training Institute during my SIA training course. The teaching was excellent, and the trainers were very helpful, professional, and supportive throughout the course. They explained everything clearly and made the learning process easy to understand. The overall environment was friendly and welcoming. I would highly recommend Read Training Institute to anyone looking to complete their SIA security training. Thank you to the whole team for providing such a positive learning experience!' },
  { name: 'laiba arooj', topic: null, home: true, text: 'I really enjoyed the SIA training. The trainer was very helpful, professional and explained practically everything clearly. The training was informative and easy to understand, with useful examples and practical information. I learned a lot about the role and responsibilities of a security officer. Overall, it was a very good experience and I would definitely recommend this training to others.' },
  { name: 'Hamid', topic: null, home: false, text: 'I had a wonderful experience at the training centre. The training was well organised, informative, and very helpful. A special thanks to MD Yousaf Sir, the centre manager, for his excellent management, professionalism, and support throughout the training.\n\nI would also like to appreciate all the staff for being friendly, helpful, cooperative, and welcoming. They made the whole experience smooth and enjoyable.\n\nI highly recommend this training centre to anyone looking for quality training and professional support. Thank you to MD Yousaf Sir, the centre manager, and the entire team for their excellent service!' },
] as const

let n = 0
for (const r of REVIEWS) {
  const same = and(eq(reviews.reviewerName, r.name), eq(reviews.body, r.text))
  if (remove) {
    n += (await db.delete(reviews).where(same).returning({ id: reviews.id })).length
    continue
  }
  const row = { source: 'imported' as const, status: 'published' as const, reviewerName: r.name, rating: 5, body: r.text, reviewDate: null, topic: r.topic, onHome: r.home, ...ORIGIN }
  const [there] = await db.select({ id: reviews.id }).from(reviews).where(same)
  if (there) await db.update(reviews).set({ ...row, updatedAt: new Date() }).where(eq(reviews.id, there.id))
  else {
    await db.insert(reviews).values(row)
    n++
  }
}
type Imported = { name: string; rating: number; date: string; topic: string | null; url: string; text: string }
const TRUSTPILOT: Imported[] = JSON.parse(readFileSync(new URL('./data/trustpilot-reviews.json', import.meta.url), 'utf8'))
let t = 0
for (const r of TRUSTPILOT) {
  // a Trustpilot review is known by its own link
  const same = eq(reviews.originUrl, r.url)
  if (remove) {
    t += (await db.delete(reviews).where(same).returning({ id: reviews.id })).length
    continue
  }
  const row = { source: 'imported' as const, status: 'published' as const, reviewerName: r.name, rating: r.rating, body: r.text, reviewDate: r.date, dateIsApproximate: false, topic: r.topic, onHome: false, origin: 'Trustpilot', originUrl: r.url }
  const [there] = await db.select({ id: reviews.id }).from(reviews).where(same)
  if (there) await db.update(reviews).set({ ...row, updatedAt: new Date() }).where(eq(reviews.id, there.id))
  else {
    await db.insert(reviews).values(row)
    t++
  }
}
console.log(remove ? `Removed ${n} Google and ${t} Trustpilot reviews.` : `Added ${n} Google reviews (${REVIEWS.length - n} already there) and ${t} Trustpilot reviews (${TRUSTPILOT.length - t} already there, brought up to date).`)
process.exit(0)
