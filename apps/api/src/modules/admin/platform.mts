import { createTRPCRouter, adminProcedure } from '../../trpc/trpc.mjs'

// Platform settings (Part B, B3): which outside services are connected. The keys are environment variables (the root .env
// locally, Vercel's settings when deployed) and never leave the server: this says only whether each one is set, so the screen
// can show "Connected" or "Not connected" and which settings a developer needs to add.
const SERVICES = [
  { key: 'auth', name: 'Sign-in and database', purpose: 'Accounts, sign-in emails and all saved data (Supabase).', vars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'], used: 'now' },
  { key: 'email', name: 'Email sending', purpose: 'The emails the platform sends itself, such as welcome and provider decisions.', vars: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'], used: 'now' },
  { key: 'stripe', name: 'Card payments', purpose: 'Taking payments, refunds and provider payouts (Stripe).', vars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], used: 'later' },
  { key: 'zoom', name: 'Live online classes', purpose: 'Creating the meeting links for live online courses (Zoom).', vars: ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'], used: 'later' },
  { key: 'botcheck', name: 'Bot check', purpose: 'Stopping automated sign-ups and form spam (Cloudflare Turnstile).', vars: ['TURNSTILE_SECRET_KEY'], used: 'later' },
  { key: 'helpdesk', name: 'Help desk', purpose: 'Sending contact-form messages to the support team’s help desk tool.', vars: ['HELPDESK_API_KEY'], used: 'later' },
] as const

export const platformRouter = createTRPCRouter({
  services: adminProcedure('admin.panel.open').query(() =>
    SERVICES.map((s) => {
      const missing = s.vars.filter((v) => !process.env[v]?.trim())
      return { ...s, vars: [...s.vars], connected: missing.length === 0, missing }
    }),
  ),
})
