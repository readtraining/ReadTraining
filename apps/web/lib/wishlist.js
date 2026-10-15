import { useEffect, useState } from "react";

// Saved courses, remembered per browser (localStorage) until a real account list exists. The listing card and the course
// page share this, so a course saved in one place shows as saved in the other.
const WISHLIST_KEY = "rt-course-wishlist";
const readWishlist = () => {
  try {
    return JSON.parse(window.localStorage.getItem(WISHLIST_KEY) || "[]");
  } catch {
    return [];
  }
};

// Every saved course id, in the order saved (the account's saved courses page).
export const savedCourseIds = () => readWishlist();

// Returns [saved, toggle]. toggle() flips the state at once and returns true (now saved) or false (now removed);
// if the browser refuses to store it, the state is put back and the error is thrown for the caller to report.
export function useWishlist(id) {
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(readWishlist().includes(id)), [id]);
  const toggle = () => {
    const list = readWishlist();
    const saving = !list.includes(id);
    setSaved(saving);
    try {
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(saving ? [...list, id] : list.filter((x) => x !== id)));
    } catch (e) {
      setSaved(!saving);
      throw e;
    }
    return saving;
  };
  return [saved, toggle];
}
