import type { Email } from '../lib/email.mjs'
import { button, escape, page, para, quote } from './layout.mjs'

// The email a provider's owner gets when the ReadTraining team decides on their provider account: approved, changes asked
// for (with what to change), not approved (with the reason), suspended (with the reason) or reinstated.
export type ProviderDecision = 'approve' | 'changes' | 'reject' | 'suspend' | 'reinstate'

const WORDS: Record<ProviderDecision, { subject: (name: string) => string; title: string; lines: string[]; button?: string }> = {
  approve: {
    subject: (n) => `${n} is approved on ReadTraining`,
    title: 'Your provider account is approved',
    lines: ['Good news: your provider account is approved. Your public profile can now appear in search, and the courses you publish can be booked once we have checked them.'],
    button: 'Open your provider workspace',
  },
  changes: {
    subject: (n) => `${n}: changes needed before approval`,
    title: 'A few changes before we can approve you',
    lines: ['We have looked at your provider account and need a few changes before we can approve it:'],
    button: 'Make the changes',
  },
  reject: {
    subject: (n) => `${n}: your provider application`,
    title: 'Your provider application was not approved',
    lines: ['We are sorry, but we can’t approve your provider account. The reason:'],
  },
  suspend: {
    subject: (n) => `${n} is suspended on ReadTraining`,
    title: 'Your provider account is suspended',
    lines: ['Your provider account is suspended. You can still sign in and see your workspace, but you can’t make changes and your courses can’t be booked. The reason:'],
  },
  reinstate: {
    subject: (n) => `${n} is active again on ReadTraining`,
    title: 'Your provider account is active again',
    lines: ['Your provider account is no longer suspended. Everything works as before.'],
    button: 'Open your provider workspace',
  },
}

export function providerDecisionEmail({ to, firstName, provider, decision, message, siteUrl }: { to: string; firstName: string; provider: string; decision: ProviderDecision; message?: string | null; siteUrl: string }): Email {
  const w = WORDS[decision]
  const hello = firstName.trim() ? `Hi ${firstName.trim()},` : 'Hello,'
  const workspace = `${siteUrl}/provider`
  const help = `${siteUrl}/contact-us`
  const text = [
    hello,
    '',
    ...w.lines,
    ...(message ? ['', message] : []),
    '',
    ...(w.button ? [`${w.button}: ${workspace}`, ''] : []),
    `Questions? Reply to this email or contact us: ${help}`,
    '',
    'The ReadTraining team',
  ].join('\n')
  const html = page({
    title: w.title,
    body: [para(hello), ...w.lines.map((l) => para(l)), message ? quote(message) : '', w.button ? button(workspace, w.button) : ''].join('\n'),
    footer: `Questions? Reply to this email or <a href="${help}" style="color:#6440FB;">contact us</a>.<br>You are receiving this because you manage ${escape(provider)} on ReadTraining.`,
  })
  return { to, subject: w.subject(provider), text, html }
}
