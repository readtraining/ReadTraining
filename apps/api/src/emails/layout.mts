// The frame every email the API sends shares: the navy ReadTraining band, a white card and a muted footer. Email programs
// ignore stylesheets, so the styles are inline; the colours are the site's brand values (navy #140342, purple #6440FB,
// muted #4F547B).
export const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const para = (text: string, muted = false) =>
  `<p style="margin:0 0 12px;font-size:${muted ? 14 : 16}px;line-height:1.5;${muted ? 'color:#4F547B;' : ''}">${escape(text)}</p>`

export const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;margin-top:8px;padding:12px 22px;background:#6440FB;border-radius:8px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escape(label)}</a>`

// a quoted message from the team (a reason, the changes asked for), kept exactly as written
export const quote = (text: string) =>
  `<div style="margin:4px 0 16px;padding:12px 16px;border-left:4px solid #6440FB;background:#F5F7FE;font-size:15px;line-height:1.5;white-space:pre-line;">${escape(text)}</div>`

export function page({ title, body, footer }: { title: string; body: string; footer: string }) {
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#F5F7FE;font-family:Arial,Helvetica,sans-serif;color:#140342;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FE;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#140342;padding:20px 28px;font-size:20px;font-weight:700;color:#ffffff;">Read<span style="color:#00FF84;">Training</span></td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#140342;">${escape(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #EDEDED;font-size:13px;line-height:1.5;color:#4F547B;">${footer}</td></tr>
</table></td></tr></table>
</body></html>`
}
