import { demoCourse } from "@/data/demoCourses";
import { DAY, currentAdmin, update } from "@/lib/adminStore";

// DEMO: the admin's review moderation (Part B, B3) until learners can leave reviews after real bookings. The reviews are the seeds
// below; hiding, showing again and settling a provider's challenge are saved in this browser (lib/adminStore.js). lib/admin.js
// getAdmin() adds them to the admin data. Swap for API calls with the reviews table.

// [courseId (data/demoCourses.js), provider, learner, rating, days ago, title, text, provider reply, provider's challenge]
const SEEDS = [
  [1, "Apex Training", "Jordan Hayes", 5, 2, "Clear, practical and well run", "The trainer kept it practical and every scenario felt like real door work. Passed all four exams first time.", "Thank you Jordan, good luck with your licence application.", null],
  [5, "Harbour Training Group", "Priya Shah", 5, 3, "Great first aid day", "Lots of hands-on practice with the mannequins. I feel confident I could help someone now.", null, null],
  [3, "Northstar Training", "Callum Reid", 2, 4, "Started an hour late", "The venue wasn't open when we arrived and the course started an hour late, so the last module felt rushed.", "We are sorry about the venue. The building manager was late and we have since changed venue for this course.", null],
  [9, "Pinnacle Compliance Training", "Grace Walsh", 1, 5, "Trainer was rude and the course was a waste of money", "Absolutely useless. The trainer was rude to everyone, I would never recommend this company to anyone.", null, "This learner did not attend the course: the register shows a no-show on the day. We'd like the review removed."],
  [6, "Kestrel Safety Training", "Daniel Okafor", 4, 6, "Good content, small room", "Everything we needed for the workplace, but the room was too small for 14 people.", null, null],
  [2, "ClearView Learning", "Hannah Lewis", 5, 8, "Excellent refresher", "Covered the new requirements in detail. The online booking and joining instructions were spot on.", "Thanks Hannah!", null],
  [46, "Apex Training", "Mohammed Iqbal", 3, 9, "OK but the exam room was noisy", "Content was fine. The exam room was next to a kitchen and very noisy.", null, null],
  [13, "Summit Skills", "Emily Ward", 1, 11, "Call 07700 900123 for cheaper courses", "Don't book here, I can get you the same certificate cheaper, call me on 07700 900123.", null, "This review is an advert for another business and includes a phone number."],
  [10, "Harbour Training Group", "Tom Fletcher", 5, 13, "Best CSCS prep I have done", "Clear explanations and lots of practice questions. Passed the test the following week.", null, null],
  [11, "Northgate Learning", "Aisha Begum", 4, 16, "Useful course", "Useful and well paced. Would have liked the slides to take away.", "Slides are now sent with the certificate, thanks for the idea.", null],
  [16, "Kestrel Safety Training", "Liam Hughes", 2, 19, "Certificate took three weeks", "The course was fine but I waited three weeks for my certificate and had to chase it twice.", null, "The certificate was sent within 5 working days. The learner's email was entered wrongly at booking."],
  [12, "Beacon Training Services", "Lucy Price", 5, 24, "Friendly and professional", "Friendly trainer, good facilities and a clear explanation of what happens after the course.", null, null],
];

export function buildReviews(saved, now) {
  return SEEDS.map(([courseId, provider, learner, rating, daysAgo, title, text, reply, challenge], i) => {
    const id = `rv-${i + 1}`;
    const d = saved.reviews?.[id] || {};
    return {
      id,
      courseId,
      course: demoCourse(courseId)?.title ?? "Course",
      provider,
      learner,
      rating,
      at: now - daysAgo * DAY,
      title,
      text,
      reply,
      // a challenge stays open until an admin hides the review or keeps it
      challenge: challenge && !d.settled ? challenge : null,
      settledChallenge: challenge && d.settled ? challenge : null,
      hidden: d.hidden ? { reason: d.reason, by: d.by, at: d.at } : null,
    };
  });
}

export const hideReview = (review, reason) =>
  update((s) => {
    s.reviews = { ...(s.reviews || {}), [review.id]: { hidden: true, reason, by: currentAdmin().name, at: Date.now(), settled: true } };
  });
export const showReview = (review) =>
  update((s) => {
    s.reviews = { ...(s.reviews || {}), [review.id]: { ...(s.reviews?.[review.id] || {}), hidden: false } };
  });
// the provider's challenge is closed and the review stays up
export const keepReview = (review) =>
  update((s) => {
    s.reviews = { ...(s.reviews || {}), [review.id]: { ...(s.reviews?.[review.id] || {}), settled: true, by: currentAdmin().name, at: Date.now() } };
  });
