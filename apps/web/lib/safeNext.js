// Where a `?next=` redirect may go: only a path on this site. Used by proxy.js and the /auth routes, so one rule decides.
// Refuses other sites in every form browsers accept: "//evil.com", "/\evil.com", "\\evil.com", "https://evil.com", and
// control characters (a tab or newline inside "/\t/evil.com" is dropped by browsers). A full URL is accepted only when
// `origin` is given and it is this same site; it is reduced to its path.
export function safeNext(value, fallback = "/account", origin) {
  if (typeof value !== "string" || !value) return fallback;
  let candidate = value;
  if (origin && /^https?:\/\//i.test(candidate)) {
    try {
      const u = new URL(candidate);
      if (u.origin !== origin) return fallback;
      candidate = u.pathname + u.search + u.hash;
    } catch {
      return fallback;
    }
  }
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  return candidate;
}
