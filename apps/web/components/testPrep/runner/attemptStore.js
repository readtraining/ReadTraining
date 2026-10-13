// Where a mock test attempt is kept on this device (localStorage): the one in progress, and the last finished one that the
// result page marks. Every read and write is guarded, because storage can be missing or blocked.
const key = (subject, test) => `rt-mock:${subject}/${test}`;
const doneKey = (subject, test) => `rt-mock-done:${subject}/${test}`;

const read = (k) => {
  try {
    return JSON.parse(window.localStorage.getItem(k) || "null");
  } catch {
    return null;
  }
};
const write = (k, v) => {
  try {
    if (v === null) window.localStorage.removeItem(k);
    else window.localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

// { answers: { [questionId]: optionIndex }, flags: [questionId], current, startedAt, deadline }
export const readProgress = (subject, test) => read(key(subject, test));
export const saveProgress = (subject, test, value) => write(key(subject, test), value);
export const clearProgress = (subject, test) => write(key(subject, test), null);

// { answers, flags, seconds, reason: "finished" | "time", at, startedAt }
export const readFinished = (subject, test) => read(doneKey(subject, test));
export const saveFinished = (subject, test, value) => write(doneKey(subject, test), value);

// A finished attempt keeps its progress entry until the result page has opened, so a runner that is rebuilt on the way (the
// redirect lost) finds it again and sends the learner on. Same attempt = same startedAt.
export const isSettled = (progress, done) => Boolean(progress && done && progress.startedAt && done.startedAt === progress.startedAt);
export function settleProgress(subject, test, done) {
  if (isSettled(readProgress(subject, test), done)) clearProgress(subject, test);
}

// "45:00", "1:05:09"
export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// "12 minutes", "1 minute 5 seconds"
export function formatSpoken(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const part = (n, w) => (n ? `${n} ${w}${n === 1 ? "" : "s"}` : "");
  return [part(m, "minute"), part(s, "second")].filter(Boolean).join(" ") || "0 seconds";
}

export const fill = (text, values) => text.replace(/\{(\w+)\}/g, (all, k) => (values[k] === undefined ? all : String(values[k])));
