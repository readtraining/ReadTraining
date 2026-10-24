import { z } from 'zod'

// Input rules shared by account settings and the admin invite, so a name or password is checked the same way everywhere.

export const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}.`)
    .max(50, `Your ${label} must be 50 characters or fewer.`)
    .regex(/^[\p{L}][\p{L}\p{M} '’.-]*$/u, `Your ${label} can only use letters, spaces, hyphens and apostrophes.`)

export const newPassword = z
  .string()
  .min(8, 'Enter a new password of at least 8 characters, with a letter and a number.')
  .max(72, 'Use a password of 72 characters or fewer.')
  .refine((v) => /[a-z]/i.test(v) && /\d/.test(v), 'Enter a new password of at least 8 characters, with a letter and a number.')
