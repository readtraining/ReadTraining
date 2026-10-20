// After a form is checked and has errors: bring the first field with a message (.rt-q__err) into the middle of the screen and put
// the cursor in it, so the person lands on what needs fixing (their screen reader reads its label and message). Every form uses
// this instead of a "There is a problem" box. `root` is the form (or the block holding its fields).
// An error that came back from the server is drawn a moment later than one found in the browser, so if the message isn't on the
// page yet this looks again on the next few frames.
export function focusFirstError(root, tries = 6) {
  requestAnimationFrame(() => {
    const err = root?.querySelector(".rt-q__err");
    if (!err) {
      if (tries > 1) focusFirstError(root, tries - 1);
      return;
    }
    const box = err.closest(".rt-field, fieldset, li, .rt-lic__consent, .rt-jobs__consent, .rt-ck__field") || err.parentElement;
    const field = box.querySelector("input:not([type=hidden]):not([disabled]), select, textarea, button") || err;
    (field === err ? err : box).scrollIntoView({ block: "center", behavior: "smooth" });
    if (field !== err) field.focus({ preventScroll: true });
  });
}
