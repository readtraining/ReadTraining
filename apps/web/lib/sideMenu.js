// The work layouts' sidebar hidden with its button (components/admin/workNav.jsx), kept in this cookie so the server layouts
// (/admin, /provider) draw the page without it from the first paint. "1" = hidden.
export const SIDE_COOKIE = "rt-side-closed";
export const sideClosed = (cookieStore) => cookieStore.get(SIDE_COOKIE)?.value === "1";
