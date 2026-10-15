import { account } from "@/data/account";
import { getCourseBySlug } from "@/lib/courses";

// The customer account's reads and writes. There are no account, booking or cancellation endpoints in apps/api yet, so the profile
// and bookings live in this browser (localStorage): the demo profile and bookings from data/account.js, plus every booking made at
// checkout (saveBooking). Swap the bodies for API calls later; the pages only depend on these shapes. Browser-only: call from effects.
//
// A booking: { reference, bookedAt, method: "card" | "klarna", status: "confirmed" | "cancelled", total, company?, cancelledAt?, refund?,
//   cancellation?: { reference, requestedAt, lines: [index], reason }, demo?: true,
//   lines: [{ courseId, title, slug, imageSrc, mode, date, endDate, time, venue, city, postcode, provider, quantity, unit, total, delegates, certificate? }] }

const PROFILE_KEY = "rt-profile";
const BOOKINGS_KEY = "rt-bookings"; // bookings made at checkout, newest first
const UPDATES_KEY = "rt-booking-updates"; // cancellation requests, by reference
const DAY = 86400000;

const read = (key, fallback) => {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const today = () => isoDay(Date.now());

// ---- profile ----
export const getProfile = () => ({ ...account.demoUser, ...read(PROFILE_KEY, {}) });
export const saveProfile = async (profile) => {
  await new Promise((r) => setTimeout(r, 500));
  write(PROFILE_KEY, profile);
  return profile;
};
export const changePassword = async () => {
  await new Promise((r) => setTimeout(r, 600));
  return true;
};

// ---- bookings ----
// the demo bookings with real dates (days from today) and the catalogue course's title and picture
function demoBookings() {
  const now = Date.now();
  return account.demoBookings.map((b) => {
    const lines = b.lines.map((l) => {
      const course = getCourseBySlug(l.courseId);
      const start = now + l.startIn * DAY;
      return {
        courseId: l.courseId,
        title: course?.title || "Course",
        slug: course?.slug,
        imageSrc: course?.imageSrc,
        mode: l.mode,
        date: isoDay(start),
        endDate: isoDay(start + (l.days - 1) * DAY),
        time: l.time,
        venue: l.venue,
        city: l.city,
        postcode: l.postcode,
        provider: l.provider,
        quantity: l.delegates.length,
        unit: l.unit,
        total: Math.round(l.unit * l.delegates.length * 100) / 100,
        delegates: l.delegates,
        certificate: l.certificate ? { number: l.certificate.number, expires: isoDay(now + l.certificate.expiresInDays * DAY) } : undefined,
      };
    });
    return {
      reference: b.reference,
      bookedAt: isoDay(now - b.bookedDaysAgo * DAY),
      method: b.method,
      status: b.status,
      cancelledAt: b.cancelledDaysAgo ? isoDay(now - b.cancelledDaysAgo * DAY) : undefined,
      refund: b.refund,
      total: lines.reduce((s, l) => s + l.total, 0),
      lines,
      demo: true,
    };
  });
}

export function getBookings() {
  const updates = read(UPDATES_KEY, {});
  return [...read(BOOKINGS_KEY, []), ...demoBookings()].map((b) => (updates[b.reference] ? { ...b, ...updates[b.reference] } : b));
}
export const getBooking = (reference) => getBookings().find((b) => b.reference === reference) || null;

// A booking made at checkout, kept for the account (newest first).
export function saveBooking(booking) {
  write(BOOKINGS_KEY, [booking, ...read(BOOKINGS_KEY, []).filter((b) => b.reference !== booking.reference)]);
}

// Where a booking sits: cancelled, waiting on a cancellation, still to come (a course has not finished) or past.
export function bookingState(b) {
  if (b.status === "cancelled") return "cancelled";
  if (b.cancellation) return "requested";
  return b.lines.some((l) => (l.endDate || l.date) >= today()) ? "upcoming" : "past";
}
export const statusOf = (b) => ({ cancelled: "cancelled", requested: "requested", upcoming: "confirmed", past: "completed" })[bookingState(b)];
export const firstDate = (b) => b.lines.map((l) => l.date).sort()[0];

// The lines that can still be cancelled online: confirmed, not started yet (on demand: not started is unknown, so allowed).
export const cancellableLines = (b) => (b.status !== "confirmed" || b.cancellation ? [] : b.lines.map((l, i) => ({ ...l, index: i })).filter((l) => l.mode === "ondemand" || l.date > today()));

// Sends a cancellation request (simulated): the booking shows "Cancellation requested" until the provider decides.
export async function requestCancellation(reference, { lines, reason, details }) {
  await new Promise((r) => setTimeout(r, 800));
  const request = { reference: `CR-${String(Math.floor(100000 + Math.random() * 900000))}`, requestedAt: today(), lines, reason, details };
  write(UPDATES_KEY, { ...read(UPDATES_KEY, {}), [reference]: { cancellation: request } });
  return request;
}

// ---- certificates (from completed courses) ----
// "valid", "renew" (within 90 days of expiry) or "expired"
export function getCertificates() {
  const now = today();
  const soon = isoDay(Date.now() + 90 * DAY);
  return getBookings()
    .flatMap((b) => b.lines.filter((l) => l.certificate).map((l) => ({ ...l.certificate, title: l.title, courseId: l.courseId, slug: l.slug })))
    .map((c) => ({ ...c, state: c.expires < now ? "expired" : c.expires <= soon ? "renew" : "valid" }))
    .sort((a, b) => (a.expires < b.expires ? -1 : 1));
}

// ---- add to calendar: an .ics file for one course ----
export function calendarFile(booking, line) {
  const d = (iso) => iso.replace(/-/g, "");
  const end = isoDay(new Date(`${line.endDate || line.date}T00:00:00Z`).getTime() + DAY); // all-day events end the day after
  const where = line.venue ? `${line.venue}, ${line.city} ${line.postcode}` : line.mode === "online" ? "Live online" : "Online";
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ReadTraining//Bookings//EN", "BEGIN:VEVENT",
    `UID:${booking.reference}-${line.courseId}@readtraining.co.uk`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d(line.date)}`, `DTEND;VALUE=DATE:${d(end)}`,
    `SUMMARY:${line.title}`, `LOCATION:${where}`,
    `DESCRIPTION:Booking ${booking.reference}. ${line.time}. Provided by ${line.provider}.`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

// ---- my learning: every course booked (not cancelled), one entry per course ----
// "upcoming" until the course has finished (on demand: until 365 days after booking), then "completed"
export function getLearning() {
  const now = today();
  return getBookings()
    .filter((b) => b.status !== "cancelled")
    .flatMap((b) => b.lines.map((l, i) => ({ ...l, key: `${b.reference}-${i}`, reference: b.reference, requested: Boolean(b.cancellation), state: (l.endDate || l.date) >= now ? "upcoming" : "completed" })))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ---- payment methods: saved cards (the payment provider keeps the card; we keep its brand, last 4 digits and expiry) ----
const CARDS_KEY = "rt-cards";
export const getCards = () => read(CARDS_KEY, account.demoCards);
const brandOf = (digits) => (/^4/.test(digits) ? "Visa" : /^(5[1-5]|2[2-7])/.test(digits) ? "Mastercard" : /^3[47]/.test(digits) ? "American Express" : "Card");
export async function addCard({ number, expiry, name, makeDefault }) {
  await new Promise((r) => setTimeout(r, 600));
  const digits = number.replace(/\D/g, "");
  const [mm, yy] = expiry.split("/").map((x) => x.trim());
  const cards = getCards();
  const card = { id: `c${Date.now()}`, brand: brandOf(digits), last4: digits.slice(-4), exp: `${mm}/${yy}`, name: name.trim(), default: makeDefault || cards.length === 0 };
  write(CARDS_KEY, [...cards.map((c) => (card.default ? { ...c, default: false } : c)), card]);
  return card;
}
export function removeCard(id) {
  const rest = getCards().filter((c) => c.id !== id);
  if (rest.length && !rest.some((c) => c.default)) rest[0] = { ...rest[0], default: true }; // there is always a default
  write(CARDS_KEY, rest);
}
export const setDefaultCard = (id) => write(CARDS_KEY, getCards().map((c) => ({ ...c, default: c.id === id })));
// "MM/YY" in the past
export const cardExpired = (exp) => {
  const [mm, yy] = exp.split("/").map(Number);
  const d = new Date();
  return 2000 + yy < d.getFullYear() || (2000 + yy === d.getFullYear() && mm < d.getMonth() + 1);
};

// ---- wallet: credit (refunds to the wallet, goodwill and gift credit) spent at checkout ----
const WALLET_KEY = "rt-wallet"; // transactions added in this browser (spends at checkout)
export function getWallet() {
  const now = Date.now();
  const all = [...account.demoWallet.map((t) => ({ ...t, date: isoDay(now - t.daysAgo * DAY) })), ...read(WALLET_KEY, [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let running = 0;
  const transactions = all.map((t) => ({ ...t, balance: (running = Math.round((running + t.amount) * 100) / 100) })).reverse(); // newest first
  return { balance: running, transactions };
}
// Spend wallet credit on an order (checkout), up to the balance; returns what was used.
export function spendWallet(amount, reference) {
  const use = Math.min(Math.max(0, amount), getWallet().balance);
  if (use > 0) write(WALLET_KEY, [...read(WALLET_KEY, []), { id: `w${Date.now()}`, date: today(), label: `Used on order ${reference}`, amount: -Math.round(use * 100) / 100 }]);
  return use;
}
