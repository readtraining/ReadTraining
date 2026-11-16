// The work layouts' sidebar (components/admin/workNav.jsx), from 992px: folded to its icon rail or open, and the provider
// workspace's chosen width. Both are kept in cookies, so the server layouts (/admin, /provider) draw the page the same way from the
// first paint and nothing jumps on load. "1" = folded.
export const SIDE_COOKIE = "rt-side-closed";
export const SIDE_WIDTH_COOKIE = "rt-side-width";

// the provider workspace's sizes in px: the rail, the narrowest and widest open menu (the widest is also kept to a quarter of the
// window, but never below the default), the default, where a drag folds it, and one arrow-key step on its edge
export const SIDE = { rail: 64, min: 200, max: 280, base: 264, snap: 140, step: 16 };

export const sideClosed = (cookieStore) => cookieStore.get(SIDE_COOKIE)?.value === "1";
export const sideWidth = (cookieStore) => {
  const w = Number(cookieStore.get(SIDE_WIDTH_COOKIE)?.value);
  return Number.isInteger(w) && w >= SIDE.min && w <= SIDE.max ? w : null;
};
