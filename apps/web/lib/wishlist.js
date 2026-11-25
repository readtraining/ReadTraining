import { useCallback, useEffect, useState } from "react";
import { useAuthUser } from "@/lib/auth/authClient";

// Saved courses (the heart on course cards, "Save for later" on the course page, the account's Saved courses page). Saving is
// for signed-in people only: the buttons show once someone is signed in, never to a visitor, who would have no list to open.
// Each account's list is kept in this browser under its own key, so signing out keeps it for next time and someone else signing
// in on the same computer never sees it. (On another device the list starts empty: a list kept with the account comes later.)
const PREFIX = "rt-course-wishlist";
const keyFor = (userId) => `${PREFIX}:${userId}`;
// the one list every visitor shared before saving was tied to an account: given to the first account signed in here, then gone
const SHARED_KEY = PREFIX;
const CHANGED = "rt-wishlist-change";
// the account's Saved courses page (the "View" on the saved message)
export const SAVED_HREF = "/account/saved";

function readList(key) {
  try {
    const list = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function adoptSharedList(userId) {
  try {
    const shared = window.localStorage.getItem(SHARED_KEY);
    if (shared === null) return;
    const mine = readList(keyFor(userId));
    const merged = [...mine, ...readList(SHARED_KEY).filter((id) => !mine.includes(id))];
    window.localStorage.setItem(keyFor(userId), JSON.stringify(merged));
    window.localStorage.removeItem(SHARED_KEY);
  } catch {}
}

// The signed-in person's saved course ids, in the order saved, kept up to date when a heart changes here, in another tab, or
// on another card for the same course. `signedIn`: undefined while the sign-in is read, then true or false.
export function useSavedCourses() {
  const person = useAuthUser();
  const userId = person?.id;
  const [ids, setIds] = useState([]);
  useEffect(() => {
    if (!userId) return setIds([]);
    adoptSharedList(userId);
    const load = () => setIds(readList(keyFor(userId)));
    load();
    const onStorage = (e) => e.key === keyFor(userId) && load();
    window.addEventListener(CHANGED, load);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGED, load);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);
  // save or remove one course; returns true when it is now saved. If the browser refuses to store it, the error is thrown for
  // the caller to report, and nothing changes.
  const toggle = useCallback(
    (id) => {
      if (!userId) return false;
      const list = readList(keyFor(userId));
      const saving = !list.includes(id);
      window.localStorage.setItem(keyFor(userId), JSON.stringify(saving ? [...list, id] : list.filter((x) => x !== id)));
      window.dispatchEvent(new Event(CHANGED));
      return saving;
    },
    [userId],
  );
  return { signedIn: person === undefined ? undefined : Boolean(person), ids, toggle };
}

// One course's heart: whether it can be shown (signed in), whether it is saved, and toggle() as above.
export function useWishlist(id) {
  const { signedIn, ids, toggle } = useSavedCourses();
  return { canSave: signedIn === true, saved: ids.includes(id), toggle: () => toggle(id) };
}
