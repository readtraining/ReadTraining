// The admin's saved decisions (front end only): one record in this browser (localStorage) that every admin module writes to,
// with an audit entry per change and an event so open admin pages read again. Shared by lib/admin.js (Phase 1) and
// lib/adminWork.js (requests, Security Jobs, business accounts). Swap for API calls later.
const KEY = "rt-admin";
export const ADMIN_EVENT = "rt-admin-change";
export const DAY = 86400000;
export const HOUR = 3600000;

export const read = () => {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "null") || {};
  } catch {
    return {};
  }
};
const write = (next) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
};

// The signed-in admin ({ name, email, preset, twoStep }, from the panel's server check; set by AdminShell), so notes, history and
// audit entries carry their real name.
let me = { name: "", email: "", preset: "custom", twoStep: false };
export const actAsAdmin = (admin) => {
  if (admin) me = admin;
};
export const currentAdmin = () => me;

export const audit = (saved, action, target) => {
  saved.audit = [{ at: Date.now(), who: me.name, action, target }, ...(saved.audit || [])].slice(0, 200);
};

// one change: read, change, save, tell the open pages
export const update = (fn) => {
  const saved = read();
  fn(saved);
  write(saved);
  try {
    window.dispatchEvent(new Event(ADMIN_EVENT));
  } catch {}
};
// n working days after `ms` (Saturdays and Sundays skipped; bank holidays come with the backend)
export function addWorkingDays(ms, n) {
  let t = ms;
  let left = n;
  while (left > 0) {
    t += DAY;
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) left -= 1;
  }
  return t;
}

