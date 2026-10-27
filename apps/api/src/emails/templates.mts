import { siteContent, sql } from '@readtraining/db'
import { z } from 'zod'

import type { db as Db } from '../lib/db.mjs'
import type { Email } from '../lib/email.mjs'
import { button, escape, page, quote } from './layout.mjs'

// Every automated email the platform sends (Part B, B3: Notifications & Email Templates). Each has built-in words that an admin
// with the "content" switch can change (saved as site_content key `email:<key>`, with its history); the frame, the links and
// who gets it stay in code. Words are plain text: a blank line starts a new paragraph, a line starting "- " is a bullet, and
// {placeholders} are filled in when the email is sent. A paragraph that is only {message} shows as the team's quoted note.
//
// `status`: 'live' emails are sent today; 'later' ones are ready and start when bookings and payments are connected;
// 'auth' ones are sent by Supabase sign-in (their wording is in supabase/templates), listed so the team sees every email.

export type Words = { subject: string; heading: string; body: string; button: string }
type Template = {
  name: string
  audience: 'Learner' | 'Provider' | 'Business' | 'Admin' | 'Everyone'
  trigger: string
  status: 'live' | 'later' | 'auth'
  placeholders: string[] // the ones these words may use
  required?: string[] // ones the words must keep
  link?: (siteUrl: string, vars: Record<string, string>) => string // the button's address (no link, no button)
  footer: string
  words: Words
  sample: Record<string, string>
}

const PERSON = { firstName: 'Sam' }
const PROVIDER = { ...PERSON, provider: 'Harbour Training Group' }
const BOOKING = { ...PERSON, course: 'Emergency First Aid at Work', date: 'Mon, 9 Nov 2026, 09:30', place: 'Manchester Training Centre, M1 1AE', reference: 'RT-2026-074306', total: '£183.90', provider: 'Harbour Training Group' }

export const TEMPLATES: Record<string, Template> = {
  welcome: {
    name: 'Welcome',
    audience: 'Learner',
    trigger: 'After a person signs in for the first time with a confirmed email address.',
    status: 'live',
    placeholders: ['firstName'],
    link: (s) => `${s}/courses`,
    footer: 'You are receiving this because you created a ReadTraining account.',
    words: {
      subject: 'Welcome to ReadTraining',
      heading: 'Welcome to ReadTraining',
      body: 'Hi {firstName},\n\nYour account is ready. Here is what you can do:\n\n- Compare accredited courses near you or online, and book in a few clicks.\n- Keep your bookings, certificates and receipts in one place.\n- Save courses to come back to later.',
      button: 'Find a course',
    },
    sample: PERSON,
  },
  'provider-approved': {
    name: 'Provider approved',
    audience: 'Provider',
    trigger: 'When an admin approves a provider account.',
    status: 'live',
    placeholders: ['firstName', 'provider'],
    link: (s) => `${s}/provider`,
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: '{provider} is approved on ReadTraining',
      heading: 'Your provider account is approved',
      body: 'Hi {firstName},\n\nGood news: your provider account is approved. Your public profile can now appear in search, and the courses you publish can be booked once we have checked them.',
      button: 'Open your provider workspace',
    },
    sample: PROVIDER,
  },
  'provider-changes': {
    name: 'Provider: changes needed',
    audience: 'Provider',
    trigger: 'When an admin asks a provider for changes before approving them.',
    status: 'live',
    placeholders: ['firstName', 'provider', 'message'],
    required: ['message'],
    link: (s) => `${s}/provider`,
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: '{provider}: changes needed before approval',
      heading: 'A few changes before we can approve you',
      body: 'Hi {firstName},\n\nWe have looked at your provider account and need a few changes before we can approve it:\n\n{message}',
      button: 'Make the changes',
    },
    sample: { ...PROVIDER, message: 'Please add your company registration number and upload your insurance certificate.' },
  },
  'provider-rejected': {
    name: 'Provider not approved',
    audience: 'Provider',
    trigger: 'When an admin turns down a provider application.',
    status: 'live',
    placeholders: ['firstName', 'provider', 'message'],
    required: ['message'],
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: '{provider}: your provider application',
      heading: 'Your provider application was not approved',
      body: 'Hi {firstName},\n\nWe are sorry, but we can’t approve your provider account. The reason:\n\n{message}',
      button: '',
    },
    sample: { ...PROVIDER, message: 'We could not confirm that your centre is approved by an awarding body for the courses you listed.' },
  },
  'provider-suspended': {
    name: 'Provider suspended',
    audience: 'Provider',
    trigger: 'When an admin suspends a provider account.',
    status: 'live',
    placeholders: ['firstName', 'provider', 'message'],
    required: ['message'],
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: '{provider} is suspended on ReadTraining',
      heading: 'Your provider account is suspended',
      body: 'Hi {firstName},\n\nYour provider account is suspended. You can still sign in and see your workspace, but you can’t make changes and your courses can’t be booked. The reason:\n\n{message}',
      button: '',
    },
    sample: { ...PROVIDER, message: 'Three learners reported that the course on 2 November did not run and were not contacted.' },
  },
  'provider-reinstated': {
    name: 'Provider active again',
    audience: 'Provider',
    trigger: 'When an admin lifts a provider’s suspension.',
    status: 'live',
    placeholders: ['firstName', 'provider'],
    link: (s) => `${s}/provider`,
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: '{provider} is active again on ReadTraining',
      heading: 'Your provider account is active again',
      body: 'Hi {firstName},\n\nYour provider account is no longer suspended. Everything works as before.',
      button: 'Open your provider workspace',
    },
    sample: PROVIDER,
  },
  'course-approved': {
    name: 'Course approved',
    audience: 'Provider',
    trigger: 'When an admin approves a course a provider sent for approval.',
    status: 'live',
    placeholders: ['firstName', 'provider', 'course'],
    link: (s, v) => `${s}/provider/courses/${v.courseId ?? ''}`,
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: '{course} is live on ReadTraining',
      heading: 'Your course is live',
      body: 'Hi {firstName},\n\nWe have checked {course} and it is now live on ReadTraining. Learners can find it in search, and book it on the dates you add.',
      button: 'Open the course',
    },
    sample: { ...PROVIDER, course: 'Emergency First Aid at Work', courseId: '1000' },
  },
  'course-changes': {
    name: 'Course: changes needed',
    audience: 'Provider',
    trigger: 'When an admin asks a provider to change a course before it goes live.',
    status: 'live',
    placeholders: ['firstName', 'provider', 'course', 'message'],
    required: ['message'],
    link: (s, v) => `${s}/provider/courses/${v.courseId ?? ''}`,
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: '{course}: changes needed before it goes live',
      heading: 'A few changes before your course goes live',
      body: 'Hi {firstName},\n\nWe have looked at {course} and need a few changes before it can go live:\n\n{message}\n\nMake the changes, then send the course for approval again.',
      button: 'Make the changes',
    },
    sample: { ...PROVIDER, course: 'Emergency First Aid at Work', courseId: '1000', message: 'Please add the exam details: the pass mark and how long the assessment takes.' },
  },
  'course-change-approved': {
    name: 'Course change approved',
    audience: 'Provider',
    trigger: 'When an admin approves a change to a live course.',
    status: 'live',
    placeholders: ['firstName', 'provider', 'course'],
    link: (s, v) => `${s}/provider/courses/${v.courseId ?? ''}`,
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: 'Your changes to {course} are live',
      heading: 'Your changes are live',
      body: 'Hi {firstName},\n\nWe have checked your changes to {course}. Learners now see the new version.',
      button: 'Open the course',
    },
    sample: { ...PROVIDER, course: 'Emergency First Aid at Work', courseId: '1000' },
  },
  'course-change-rejected': {
    name: 'Course change not approved',
    audience: 'Provider',
    trigger: 'When an admin turns down a change to a live course.',
    status: 'live',
    placeholders: ['firstName', 'provider', 'course', 'message'],
    required: ['message'],
    link: (s, v) => `${s}/provider/courses/${v.courseId ?? ''}`,
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: 'Your changes to {course} were not approved',
      heading: 'Your changes were not approved',
      body: 'Hi {firstName},\n\nWe could not approve your changes to {course}, so learners still see the version that was live before:\n\n{message}\n\nYou can edit the course and send the changes again.',
      button: 'Open the course',
    },
    sample: { ...PROVIDER, course: 'Emergency First Aid at Work', courseId: '1000', message: 'The new title names a qualification the course does not lead to.' },
  },
  'course-paused': {
    name: 'Course paused by ReadTraining',
    audience: 'Provider',
    trigger: 'When an admin takes a live course off the site.',
    status: 'live',
    placeholders: ['firstName', 'provider', 'course', 'message'],
    required: ['message'],
    link: (s, v) => `${s}/provider/courses/${v.courseId ?? ''}`,
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: '{course} has been paused',
      heading: 'Your course has been paused',
      body: 'Hi {firstName},\n\nWe have taken {course} off ReadTraining for now. Its dates are kept, and learners who already booked keep their places.\n\n{message}\n\nReply to this email if you have any questions.',
      button: 'Open the course',
    },
    sample: { ...PROVIDER, course: 'Emergency First Aid at Work', courseId: '1000', message: 'We have had complaints that the venue address is wrong. Please check it and contact us.' },
  },
  'booking-confirmed': {
    name: 'Booking confirmed',
    audience: 'Learner',
    trigger: 'When a payment goes through, or an invoiced booking is accepted.',
    status: 'later',
    placeholders: ['firstName', 'course', 'date', 'place', 'reference', 'total', 'provider'],
    link: (s) => `${s}/account/purchases`,
    footer: 'You are receiving this because you booked a course on ReadTraining.',
    words: {
      subject: 'Booking confirmed: {course}',
      heading: 'Your booking is confirmed',
      body: 'Hi {firstName},\n\nThank you for booking with ReadTraining. Here are your details:\n\n- Course: {course}\n- When: {date}\n- Where: {place}\n- Training provider: {provider}\n- Booking reference: {reference}\n- Total paid: {total}\n\nYour training provider will email the joining instructions before the course.',
      button: 'View your booking',
    },
    sample: BOOKING,
  },
  'course-reminder': {
    name: 'Course reminder',
    audience: 'Learner',
    trigger: 'Two days before a course starts.',
    status: 'later',
    placeholders: ['firstName', 'course', 'date', 'place', 'reference'],
    link: (s) => `${s}/account/learning`,
    footer: 'You are receiving this because you booked a course on ReadTraining.',
    words: {
      subject: 'Reminder: {course} starts soon',
      heading: 'Your course starts soon',
      body: 'Hi {firstName},\n\n{course} starts on {date} at {place}.\n\nBring photo ID and arrive 15 minutes early. If you can’t make it, change the date from your account as soon as you can.',
      button: 'View your booking',
    },
    sample: BOOKING,
  },
  'booking-cancelled': {
    name: 'Booking cancelled',
    audience: 'Learner',
    trigger: 'When a booking is cancelled by the learner, the provider or the ReadTraining team.',
    status: 'later',
    placeholders: ['firstName', 'course', 'date', 'reference', 'message'],
    link: (s) => `${s}/account/purchases`,
    footer: 'You are receiving this because you booked a course on ReadTraining.',
    words: {
      subject: 'Booking cancelled: {course}',
      heading: 'Your booking is cancelled',
      body: 'Hi {firstName},\n\nYour booking {reference} for {course} on {date} is cancelled.\n\n{message}\n\nIf a refund is due, we will email you when it is on its way.',
      button: 'View your bookings',
    },
    sample: { ...BOOKING, message: 'The training provider had to cancel this date because the trainer is unwell.' },
  },
  'refund-decision': {
    name: 'Refund decision',
    audience: 'Learner',
    trigger: 'When a refund request is accepted or declined.',
    status: 'later',
    placeholders: ['firstName', 'course', 'reference', 'total', 'message'],
    required: ['message'],
    link: (s) => `${s}/account/purchases`,
    footer: 'You are receiving this because you asked for a refund on ReadTraining.',
    words: {
      subject: 'Your refund request for {reference}',
      heading: 'An update on your refund request',
      body: 'Hi {firstName},\n\nWe have looked at your refund request for {course} ({reference}).\n\n{message}\n\nAccepted refunds reach the card you paid with in 5 to 10 working days.',
      button: 'View your booking',
    },
    sample: { ...BOOKING, message: 'Your refund of £183.90 is accepted.' },
  },
  'certificate-ready': {
    name: 'Certificate ready',
    audience: 'Learner',
    trigger: 'When the training provider uploads a learner’s certificate.',
    status: 'later',
    placeholders: ['firstName', 'course'],
    link: (s) => `${s}/account/learning`,
    footer: 'You are receiving this because you completed a course booked on ReadTraining.',
    words: {
      subject: 'Your certificate for {course} is ready',
      heading: 'Your certificate is ready',
      body: 'Hi {firstName},\n\nWell done on completing {course}. Your certificate is ready to download from your account.',
      button: 'Get your certificate',
    },
    sample: BOOKING,
  },
  'review-request': {
    name: 'Review request',
    audience: 'Learner',
    trigger: 'Three days after a course ends.',
    status: 'later',
    placeholders: ['firstName', 'course', 'provider'],
    link: (s) => `${s}/account/learning`,
    footer: 'You are receiving this because you completed a course booked on ReadTraining.',
    words: {
      subject: 'How was {course}?',
      heading: 'How was your course?',
      body: 'Hi {firstName},\n\nYou recently finished {course} with {provider}. A short review helps other learners choose the right course, and it takes less than a minute.',
      button: 'Leave a review',
    },
    sample: BOOKING,
  },
  'provider-new-booking': {
    name: 'New booking (provider)',
    audience: 'Provider',
    trigger: 'When a learner books one of the provider’s courses.',
    status: 'later',
    placeholders: ['firstName', 'provider', 'course', 'date', 'reference'],
    link: (s) => `${s}/provider/orders`,
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: 'New booking: {course} on {date}',
      heading: 'You have a new booking',
      body: 'Hi {firstName},\n\nA learner has booked {course} on {date} (booking {reference}).\n\nPlease send the joining instructions at least two days before the course.',
      button: 'Open the booking',
    },
    sample: BOOKING,
  },
  'payout-sent': {
    name: 'Payout sent',
    audience: 'Provider',
    trigger: 'When a monthly payout is sent to the provider’s bank account.',
    status: 'later',
    placeholders: ['firstName', 'provider', 'total', 'reference'],
    link: (s) => `${s}/provider/orders`,
    footer: 'You are receiving this because you manage {provider} on ReadTraining.',
    words: {
      subject: 'Your payout of {total} is on its way',
      heading: 'Your payout is on its way',
      body: 'Hi {firstName},\n\nWe have sent {total} to the bank account on file for {provider} (payout {reference}). It usually arrives within 2 working days.\n\nThe statement in your workspace shows every booking this payout covers.',
      button: 'View the statement',
    },
    sample: { ...PROVIDER, total: '£4,812.40', reference: 'PO-2026-11' },
  },
  'admin-invite': {
    name: 'Admin invite',
    audience: 'Admin',
    trigger: 'When someone without a ReadTraining account is invited to the admin team (Admin › Team, or the first super admin).',
    status: 'live',
    placeholders: ['firstName', 'invitedBy', 'role', 'hours'],
    // the personal, single-use link to set a password (made when the email is sent)
    link: (s, v) => v.link || `${s}/admin/login`,
    footer: 'You are receiving this because you were invited to the ReadTraining admin team.',
    words: {
      subject: 'You’re invited to the ReadTraining admin',
      heading: 'Join the ReadTraining admin team',
      body: 'Hi {firstName},\n\n{invitedBy} has invited you to the ReadTraining admin panel as a {role} admin.\n\nSet your password to finish. The link works once and expires in {hours} hours. If it has expired, ask {invitedBy} to send you a new invite.\n\nIf you weren’t expecting this email, you can ignore it.',
      button: 'Set your password',
    },
    sample: { firstName: '', invitedBy: 'Alex Morgan', role: 'Support', hours: '24' },
  },
  'admin-added': {
    name: 'Added to the admin team',
    audience: 'Admin',
    trigger: 'When someone who already has a ReadTraining account is added to the admin team.',
    status: 'live',
    placeholders: ['firstName', 'invitedBy', 'role'],
    link: (s) => `${s}/admin/login`,
    footer: 'You are receiving this because you were added to the ReadTraining admin team.',
    words: {
      subject: 'You’ve been added to the ReadTraining admin team',
      heading: 'Welcome to the admin team',
      body: 'Hi {firstName},\n\n{invitedBy} has added you to the ReadTraining admin panel as a {role} admin.\n\nSign in at the admin sign-in page with your usual ReadTraining email and password.\n\nIf you weren’t expecting this email, please reply and let us know.',
      button: 'Go to the admin sign-in',
    },
    sample: { firstName: 'Sam', invitedBy: 'Alex Morgan', role: 'Finance' },
  },
  'auth-confirm': {
    name: 'Confirm your email',
    audience: 'Everyone',
    trigger: 'When someone signs up. Sent by the sign-in service.',
    status: 'auth',
    placeholders: [],
    footer: '',
    words: { subject: 'Confirm your email address', heading: '', body: '', button: '' },
    sample: {},
  },
  'auth-reset': {
    name: 'Reset your password',
    audience: 'Everyone',
    trigger: 'When someone asks to reset their password. Sent by the sign-in service.',
    status: 'auth',
    placeholders: [],
    footer: '',
    words: { subject: 'Reset your ReadTraining password', heading: '', body: '', button: '' },
    sample: {},
  },
  'auth-email-change': {
    name: 'Confirm a new email address',
    audience: 'Everyone',
    trigger: 'When someone changes their email address. Sent by the sign-in service.',
    status: 'auth',
    placeholders: [],
    footer: '',
    words: { subject: 'Confirm your new email address', heading: '', body: '', button: '' },
    sample: {},
  },
}

export const EMAIL_KEY = /^email:([a-z-]+)$/
export const editableTemplate = (key: string) => {
  const t = TEMPLATES[key]
  return t && t.status !== 'auth' ? t : null
}

const PLACEHOLDER = /\{([a-zA-Z]+)\}/g
// The words an admin saves for one template: the lengths, and only that template's placeholders (the required ones kept).
export function wordsSchema(key: string) {
  const t = editableTemplate(key)!
  const known = (v: string) => [...v.matchAll(PLACEHOLDER)].every((m) => t.placeholders.includes(m[1]))
  const unknownMessage = `Use only these placeholders: ${t.placeholders.map((p) => `{${p}}`).join(', ')}.`
  const line = (min: number, max: number, what: string) =>
    z.string().trim().min(min, `Enter the ${what}.`).max(max, `Keep the ${what} to ${max} characters or fewer.`).refine(known, unknownMessage)
  return z
    .object({
      subject: line(3, 150, 'subject'),
      heading: line(3, 120, 'heading'),
      body: line(10, 4000, 'message'),
      button: t.link ? line(2, 40, 'button text') : z.literal(''),
    })
    .superRefine((w, ctx) => {
      for (const p of t.required ?? []) {
        if (!w.body.includes(`{${p}}`)) ctx.addIssue({ code: 'custom', path: ['body'], message: `Keep {${p}} in the message: it is where the team’s note goes.` })
      }
    })
}

// The saved words for a template, or its built-in ones.
export async function wordsFor(db: typeof Db, key: string): Promise<Words> {
  const [row] = await db.execute<{ value: Words }>(sql`select value from ${siteContent} where key = ${`email:${key}`}`)
  return row?.value ?? TEMPLATES[key].words
}

// The finished email: placeholders filled in (a greeting with no first name becomes "Hello,"), paragraphs, bullets and the
// team's quoted note, in the shared frame, with a plain-text copy.
export function renderEmail(key: string, words: Words, vars: Record<string, string>, siteUrl: string, to: string): Email {
  const t = TEMPLATES[key]
  const fill = (s: string) => s.replace(PLACEHOLDER, (_, name: string) => vars[name] ?? '')
  const body = vars.firstName?.trim() ? words.body : words.body.replace(/^(Hi|Hello|Dear) \{firstName\},/m, 'Hello,')
  const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  const href = t.link?.(siteUrl, vars)
  const html = blocks
    .map((b) => {
      if (b === '{message}') return vars.message ? quote(vars.message) : ''
      const lines = b.split('\n')
      if (lines.every((l) => l.trim().startsWith('- '))) {
        return `<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;color:#4F547B;">${lines.map((l) => `<li>${escape(fill(l.trim().slice(2)))}</li>`).join('')}</ul>`
      }
      return `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">${lines.map((l) => escape(fill(l))).join('<br>')}</p>`
    })
    .join('\n')
  const help = `${siteUrl}/contact-us`
  const footer = `${escape(fill(t.footer))}<br>Questions? Reply to this email or <a href="${help}" style="color:#6440FB;">contact us</a>.`
  const text = [
    ...blocks.map((b) => (b === '{message}' ? vars.message ?? '' : fill(b))),
    ...(href && words.button ? [`${fill(words.button)}: ${href}`] : []),
    `Questions? Reply to this email or contact us: ${help}`,
    'The ReadTraining team',
  ]
    .filter(Boolean)
    .join('\n\n')
  return {
    to,
    subject: fill(words.subject),
    text,
    html: page({ title: fill(words.heading), body: html + (href && words.button ? `\n${button(href, fill(words.button))}` : ''), footer }),
  }
}
