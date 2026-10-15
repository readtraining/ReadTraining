import { useEffect, useRef } from "react";

// The one keyboard behaviour for every pop-up, side sheet and menu panel (Sheet, the catalogue's filter sheet, the mobile menu,
// the mini basket): while `active`, Tab and Shift+Tab stay inside `ref`'s element and Escape calls `onEscape`. Focus placement
// on open and on close stays with each component, which knows where it should go.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active, ref, onEscape) {
  const escRef = useRef(onEscape);
  escRef.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      const box = ref.current;
      if (!box) return;
      if (e.key === "Escape") {
        e.preventDefault();
        escRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, ref]);
}
