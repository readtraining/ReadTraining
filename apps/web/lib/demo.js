// Demo records (made-up bookings, approvals, requests and so on) show on development and the test copy only. On the live site
// (a Vercel production build) they are off: a page made of demo records shows an honest empty state instead, and nothing made up
// is counted in a badge or a queue. Set in next.config.ts from VERCEL_ENV; SHOW_DEMO=on/off in the environment overrides it.
export const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO !== "off";
