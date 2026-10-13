# ReadTraining design system

The rules every **new** page and component follows, so it never needs restyling later. The reference is the home page.
Older pages that don't follow these rules yet get moved onto them later. Don't copy styles from those pages, copy from the
parts named here.

Tokens live in `public/assets/sass/custom.scss` (block `DESIGN TOKENS`). Our CSS goes in `custom.scss` only, with
`rt-` prefixed classes. Never edit the template's `public/assets/css/main.css`.

## 1. Colours

Use the token for the job. No hex, rgb or hsl values in new code.

| Token | Use |
|---|---|
| `--rt-c-text` | headings and body text on white |
| `--rt-c-muted` | secondary text, hints, meta lines |
| `--rt-c-line` | card and input borders, dividers |
| `--rt-c-surface` | cards, panels |
| `--rt-c-soft` | soft panels, input fill, light page tint |
| `--rt-c-brand` | primary buttons, links, active states |
| `--rt-c-brand-soft` | active nav item, chips, icon tiles |
| `--rt-c-accent` | green accents **on dark backgrounds only**, never as text on white (contrast about 1.3:1) |
| `--rt-c-dark` | dark heroes and dark sections |
| `--rt-c-success` | success text and badges |
| `--rt-c-success-soft` | the one light green behind success text (badges, chips) |
| `--rt-c-error` | inline form errors |

On dark backgrounds use white text, `rgba(255, 255, 255, 0.72)` for secondary text, and `--rt-c-accent` for accents
(as `.rt-eyebrow--pill.-onDark`).

## 2. Type

There are two page types, each with its own scale. Both use `--rt-heading-weight` (700), sentence case, and UK English.

| | Marketing pages | App pages |
|---|---|---|
| Which | home, for-business, for-providers, licences, Skill Saver, about, contact… | account, business account, admin, provider workspace, dashboards |
| H1 | `--rt-h1-size` (52px) | `--rt-app-h1` (28 to 36px) |
| H2 | `--rt-h2-size` (44px) | `--rt-app-h2` (28px) |
| Card title | `--rt-h3-size` (24px) | `--rt-app-h3` (20px) |
| Body | `--rt-text` (16px), lead 17 to 18px | `--rt-text`, tables and meta `--rt-text-sm` (14px) |

**Product and content pages** (the course catalogue, course detail, test prep subjects, legal pages) use the app scale
(`--rt-page-h1-size` 36px, `--rt-page-h2-size` 28px), including any shared section dropped onto them. Whatever the page, its H1
is never smaller than its H2s.

Labels, chips and eyebrows use `--rt-text-xs` (12px) at weight 600. Small caps eyebrows use the `Eyebrow` pill only.

## 3. Shape, space and depth

- **Cards:** `--rt-radius-card` (16px), 1px `--rt-c-line` border, `--rt-pad-card` (24px, 16px under 576px), white.
  Hover, only on cards that are links: `--rt-shadow-hover`.
- **Inputs:** `--rt-radius-control` (10px). **Small inner buttons and thumbnails:** `--rt-radius-sm` (8px).
  **Chips and badges:** `--rt-radius-pill`.
- **Grid gap:** `--rt-gap` (24px). **Marketing section padding:** `--rt-section-y` (88px, then 64px under 992px and
  48px under 576px), already built into `.fb-section`.
- **Shadows:** only these three: `--rt-shadow-hover` (cards), `--rt-shadow-raised` (floating chips and overlapping
  logos) and `--rt-shadow-dialog` (dialogs, sheets, menus). All are tinted with the site navy.
- **Breakpoints:** 576px (phone), 768px, **992px** (sidebars and two-column layouts collapse here), 1200px. Don't use
  1024px.

## 4. Buttons

Use the template's button classes only. Don't create new button classes.

| Need | Class |
|---|---|
| Primary action | `button -md -purple-1 text-white` |
| Secondary action | `button -md -outline-purple-1 text-purple-1` |
| Inside cards and tables | the same with `-sm` |
| On a dark section | primary stays `-purple-1`; secondary `-outline-white text-white` |
| Text link with arrow | `fb-textlink` (marketing) |
| Marketing call to action | `CtaLink` from `components/marketing/parts.jsx` |

There is one primary button per view. While a button is working, set `disabled`, `aria-busy="true"` and a label like
"Saving…". Never use a green filled button on white.

## 5. Forms

- Wrap every field in `.rt-field`, with a `<label>`, an optional hint, and the error **above** the input:
  `<p className="rt-q__err" id="…-e"><span className="rt-sr">Error: </span>…</p>`. Link the error with
  `aria-describedby` and set `aria-invalid`.
- Add `noValidate` to every `<form>`. Check on submit, then call `focusFirstError(form)` from `lib/focusFirstError.js`.
- **Never** show a "There is a problem" summary box, and never let the browser show its own pop-up.
- Selects and textareas are already styled by `.rt-field`. Give every field an `autoComplete` value.
- Use one checkbox and radio style: the catalogue's `.rt-fp__check` and `.rt-fp__radio` look. Don't use bare browser boxes.
- Search boxes hide the browser's own clear button, and number inputs hide the browser's spinners.

## 6. Layout parts to build with

**Every page:** `HomeHeader`, `HomeFooter`, and `HomeHelp` (marketing pages only), plus a skip link (`.rt-skip`).
Set metadata with `pageMetadata({ title, description, path, noindex })` from `lib/seo.js`, plus `breadcrumbLd` and
`jsonLd`. Routes come from `lib/routes.js`.

**Marketing pages** sit in `fb-page`:
- **Hero:** use `MastheadHero` (light, product visual) or `MarketingHero` (dark, centred).
- **Sections:** `.fb-section` (`-white`, `-lavender`, `-dark`) and `.fb-split` (copy beside a visual), plus
  `Eyebrow`, `Ticks`, `Points` and `ProductFrame` (`components/marketing`).
- **Closing sections:** `StepsSection`, `FaqSection` and `CtaBand`. Use `FaqSection` for every FAQ; don't make another.

**App pages:**
- **Customer and business:** `AccountShell` (`components/account`).
- **Admin:** `AdminShell` (`components/admin`).
- **Provider workspace:** `ProviderShell` (`components/providerWorkspace`), the admin's layout with the provider's organisation in the sidebar. Its extra parts (`Loading`, `Empty`, `Toggle`, `ToolSelect`, `Choice`, `Stats`) are in `providerParts.jsx`; records and actions in `lib/providerWorkspace.js`.
- **Cards and titles:** cards are `.rt-acc__card` and card titles `.rt-acc__h2`.
- **Status and controls:** status pills use `Pill`; tabs, search and due dates use `Tabs`, `Search` and `Due`
  (`components/admin/adminParts.jsx`).
- **Tables:** use the `.rt-biz__table` pattern, which stacks into labelled rows on phones via `data-label`.

**Sidebars:** use one pattern: the account and admin nav (a white card list with a `--rt-c-brand-soft` active item),
which becomes a scrolling chip row below 992px. Long documents use `DocToc` (contents in a `<details>` on phones).

**Sign-in pages:** `AuthPage`, `AuthField`, `AuthCheck` and `AuthNotice` (`components/auth/authParts.jsx`). **Checkboxes:** every
checkbox already gets the one style site-wide; switches use `Toggle`.

**Dialogs and side panels:** use `Sheet` (`components/testPrep/runner/Sheet.jsx`), which handles the focus trap, Esc,
scroll lock and returning focus. Don't build another modal. A panel that can't be a `Sheet` (a menu, a drop-down)
uses `useFocusTrap` (`lib/useFocusTrap.js`) for the same keyboard behaviour. **Messages after an action:** `Toast`
(`components/courses/Toast.jsx`).

## 7. States

- Every list or panel that reads data has an **empty state** (a short title, one line, and one action), a **loading
  state** (a skeleton in the final layout's shape, not a spinner), and an **error state** (what happened and "Try again").
- Links never go to `#`. If a destination doesn't exist yet, leave the link out.
- Demo data and anything the backend will replace go through `lib/` with a `DEMO` comment, so the screens don't change
  when real data arrives.

## 8. Accessibility and copy

- Visible focus on everything you can tab to: a 3px `--rt-c-brand` outline, or `--rt-c-accent` on dark.
- Tap targets of at least 44 × 44px. Decorative images get `alt=""`. Use semantic HTML (`main`, `nav`, `section`,
  `aside`) with one `h1` per page.
- Write in UK English and sentence case. Prices are GBP (`formatPrice` from `lib/format.js`). Write plain words: no
  "Oops", no exclamation marks in messages, no lorem ipsum.

## 9. Checklist before a page is done

1. It uses only tokens and the parts above: no hex values, no one-off sizes, no new button or card styles.
2. Every link works, with no `#` and no `/template/` links.
3. It is tested at 375px, 768px and 1440px: no sideways scrolling, and no console errors.
4. Forms meet section 5, and empty, loading and error states meet section 7.
5. A backup and a revert script exist for the round.
