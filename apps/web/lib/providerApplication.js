// Provider applications from the onboarding (/provider/onboarding). DEMO: kept in this browser (localStorage) so a submitted
// application shows in Admin > Providers > Applications and Approvals straight away; with a backend these calls go to the API.
const KEY = "rt-provider-applications";
const DAY = 86400000;

export function readProviderApplications() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
export const getApplicationFor = (userId) => readProviderApplications().find((a) => a.userId === userId) || null;

const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function submitProviderApplication(userId, contact, form) {
  await new Promise((resolve) => setTimeout(resolve, 700));
  const reference = `PA-${Math.floor(100000 + Math.random() * 900000)}`;
  const app = { reference, userId, contact, submittedAt: Date.now(), status: "applied", ...form };
  const list = readProviderApplications().filter((a) => a.userId !== userId);
  try {
    window.localStorage.setItem(KEY, JSON.stringify([app, ...list]));
  } catch {}
  return app;
}

// An application in the shape the admin's provider list reads (data/admin.js `applications`).
export function toAdminApplication(a, now = Date.now()) {
  const inDays = (date) => Math.round((Date.parse(date) - now) / DAY);
  return {
    slug: `${slugify(a.name)}-${a.reference.toLowerCase()}`,
    name: a.name,
    city: a.city,
    contact: a.contact.name,
    email: a.contact.email,
    status: "applied",
    daysAgo: Math.max(0, Math.floor((now - a.submittedAt) / DAY)),
    specialisms: a.subjects.map(slugify),
    company: a.company.toUpperCase(),
    vat: a.vat,
    documents: [
      ["Accreditation", `${a.body} ${a.centre}`, inDays(a.accExpiry)],
      ["Insurance", `Public liability ${a.cover}`, inDays(a.insExpiry)],
    ],
  };
}
