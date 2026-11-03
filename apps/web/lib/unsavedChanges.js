"use client";

import { useEffect, useId } from "react";

// "You have unsaved changes": every edit form calls useUnsavedChanges(dirty) (the course editor, account settings, the provider
// settings tabs). While any form on the page has something not saved, leaving the page asks first, whichever way:
// - closing the tab, reloading, or going to another site: the browser's own "Leave site?" (beforeunload);
// - a link inside the site (Next's <Link> or a plain <a>): "leave anyway?", before the link is followed;
// - Back (or Forward) in the browser: an extra history entry for this page is added while something is unsaved, so Back lands
//   on this page again first and can ask; staying puts the entry back, leaving goes on back. When everything is saved again the
//   extra entry is taken off, so Back works as before.
// A navigation made in code (router.push from a button) isn't covered: such buttons should save, or ask, themselves.

export const LEAVE_MESSAGE = "You have unsaved changes. Leave this page anyway? What you changed will be lost.";

const dirty = new Set(); // the forms that have something unsaved (each by its own id)
let installed = false;
let guarded = false; // the extra history entry is on top
let skipPop = 0; // our own history moves, which the popstate handler lets through
let heldLink = null; // a link clicked while our own Back (taking the extra entry off) is still going: followed once it is done

const anyDirty = () => dirty.size > 0;
const sameEntry = () => ({ ...(window.history.state || {}) }); // Next's state for this page, so going back to it works as usual

function pushGuard() {
  window.history.pushState(sameEntry(), "", window.location.href);
  guarded = true;
}
function dropGuard() {
  if (!guarded) return;
  guarded = false;
  skipPop += 1;
  window.history.back();
}

function onBeforeUnload(e) {
  if (!anyDirty()) return;
  e.preventDefault();
  e.returnValue = ""; // the browser shows its own wording
}

function onClick(e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
  const url = new URL(a.getAttribute("href"), window.location.href);
  if (url.origin !== window.location.origin) return; // leaving the site: beforeunload asks
  if (url.pathname === window.location.pathname && url.search === window.location.search) return; // the same page (an anchor)
  // our own Back is still taking the extra entry off: follow the link once it has, or the Back would undo the link's page
  if (skipPop > 0) {
    e.preventDefault();
    e.stopPropagation();
    heldLink = a;
    return;
  }
  if (!anyDirty()) return;
  if (window.confirm(LEAVE_MESSAGE)) {
    dirty.clear(); // leaving: nothing else should ask on the way out
    guarded = false; // the link's page goes on top of the extra entry, which is just this page again
    return;
  }
  e.preventDefault();
  e.stopPropagation(); // Next's <Link> doesn't navigate
}

function onPopState() {
  if (skipPop > 0) {
    skipPop -= 1;
    if (skipPop === 0 && heldLink) {
      const a = heldLink;
      heldLink = null;
      setTimeout(() => a.isConnected && a.click(), 0);
    }
    return;
  }
  if (!guarded) return;
  // Back from the extra entry: we are on this page's own entry now
  guarded = false;
  if (!anyDirty()) return;
  if (window.confirm(LEAVE_MESSAGE)) {
    dirty.clear();
    skipPop += 1;
    window.history.back(); // on to where Back was going
  } else {
    pushGuard(); // stay: the extra entry goes back on, ready for the next Back
  }
}

function update() {
  if (anyDirty() && !installed) {
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    installed = true;
    pushGuard();
  } else if (!anyDirty() && installed) {
    window.removeEventListener("beforeunload", onBeforeUnload);
    // the click and popstate handlers stay until our own Back below has gone through
    installed = false;
    dropGuard();
    const tidy = () => {
      if (installed) return;
      if (skipPop > 0) return void setTimeout(tidy, 250);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
    setTimeout(tidy, 250);
  }
}

/** Ask before leaving the page while `isDirty` (something typed or chosen that isn't saved yet). */
export function useUnsavedChanges(isDirty) {
  const id = useId();
  useEffect(() => {
    if (isDirty) dirty.add(id);
    else dirty.delete(id);
    update();
  }, [isDirty, id]);
  // a form that goes away (its tab closed, its page left) no longer counts
  useEffect(
    () => () => {
      dirty.delete(id);
      update();
    },
    [id],
  );
}
