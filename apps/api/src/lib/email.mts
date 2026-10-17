import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import nodemailer from 'nodemailer'

/**
 * Sends the emails the API writes itself (Supabase sends the confirm, reset and change-email ones). Same SMTP provider as
 * Supabase, set in the root .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and EMAIL_FROM ("ReadTraining <hello@…>").
 * With EMAIL_OUTBOX_DIR set (development and tests) nothing is sent: each email is written to that folder as a .json file.
 * Returns false when it could not be sent, so the caller can try again later.
 */
export type Email = { to: string; subject: string; text: string; html: string }

const outbox = process.env.EMAIL_OUTBOX_DIR
const transport =
  !outbox && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT ?? 587) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null

export const emailConfigured = () => Boolean(outbox || (transport && process.env.EMAIL_FROM))

export async function sendEmail(email: Email): Promise<boolean> {
  const from = process.env.EMAIL_FROM ?? 'ReadTraining <no-reply@readtraining.local>'
  if (outbox) {
    mkdirSync(outbox, { recursive: true })
    writeFileSync(join(outbox, `${Date.now()}-${email.to.replace(/[^a-z0-9@.+-]/gi, '_')}.json`), JSON.stringify({ from, ...email }, null, 2))
    return true
  }
  if (!transport || !process.env.EMAIL_FROM) {
    console.warn('email: SMTP is not set up in .env, so nothing was sent')
    return false
  }
  try {
    await transport.sendMail({ from, ...email })
    return true
  } catch (error) {
    console.error('email: could not send', error instanceof Error ? error.message : error)
    return false
  }
}
