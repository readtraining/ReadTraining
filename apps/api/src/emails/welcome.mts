import type { Email } from '../lib/email.mjs'
import { button, escape, page, para } from './layout.mjs'

// The welcome email, sent once after a person's first confirmed sign-in.
export function welcomeEmail({ to, firstName, siteUrl }: { to: string; firstName: string; siteUrl: string }): Email {
  const name = firstName.trim()
  const hello = name ? `Hi ${name},` : 'Hello,'
  const courses = `${siteUrl}/courses`
  const account = `${siteUrl}/account`
  const help = `${siteUrl}/help-centre`
  const points = [
    'Compare accredited courses near you or online, and book in a few clicks.',
    'Keep your bookings, certificates and receipts in one place.',
    'Save courses to come back to later.',
  ]
  const text = [
    hello,
    '',
    'Welcome to ReadTraining. Your account is ready.',
    '',
    ...points.map((p) => `- ${p}`),
    '',
    `Find a course: ${courses}`,
    `Your account: ${account}`,
    '',
    `Questions? Visit our Help Centre (${help}) or reply to this email.`,
    '',
    'The ReadTraining team',
  ].join('\n')
  const html = page({
    title: 'Welcome to ReadTraining',
    body: `${para(hello)}
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Your account is ready. Here is what you can do:</p>
<ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.6;color:#4F547B;">${points.map((p) => `<li>${escape(p)}</li>`).join('')}</ul>
${button(courses, 'Find a course')}
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#4F547B;">Your bookings and certificates are in <a href="${account}" style="color:#6440FB;">your account</a>.</p>`,
    footer: `Questions? Visit our <a href="${help}" style="color:#6440FB;">Help Centre</a> or reply to this email.<br>You are receiving this because you created a ReadTraining account.`,
  })
  return { to, subject: 'Welcome to ReadTraining', text, html }
}
