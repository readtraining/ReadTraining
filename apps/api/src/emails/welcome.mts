import type { Email } from '../lib/email.mjs'

// The welcome email, sent once after a person's first confirmed sign-in. Email programs ignore stylesheets, so the styles are
// inline; the colours are the site's brand values (navy #140342, purple #6440FB, muted #4F547B).
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

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
  const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to ReadTraining</title></head>
<body style="margin:0;padding:0;background:#F5F7FE;font-family:Arial,Helvetica,sans-serif;color:#140342;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FE;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#140342;padding:20px 28px;font-size:20px;font-weight:700;color:#ffffff;">Read<span style="color:#00FF84;">Training</span></td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#140342;">Welcome to ReadTraining</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">${escape(hello)}</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Your account is ready. Here is what you can do:</p>
<ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.6;color:#4F547B;">${points.map((p) => `<li>${escape(p)}</li>`).join('')}</ul>
<a href="${courses}" style="display:inline-block;padding:12px 22px;background:#6440FB;border-radius:8px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Find a course</a>
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#4F547B;">Your bookings and certificates are in <a href="${account}" style="color:#6440FB;">your account</a>.</p>
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #EDEDED;font-size:13px;line-height:1.5;color:#4F547B;">Questions? Visit our <a href="${help}" style="color:#6440FB;">Help Centre</a> or reply to this email.<br>You are receiving this because you created a ReadTraining account.</td></tr>
</table></td></tr></table>
</body></html>`
  return { to, subject: 'Welcome to ReadTraining', text, html }
}
