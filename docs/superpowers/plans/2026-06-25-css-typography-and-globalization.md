# CSS Typography & Globalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop hand-picking font sizes on every element by introducing a semantic typographic scale, and remove the duplicated markup/styles that make the site feel "ungloballized."

**Architecture:** The site is static HTML styled by Tailwind v3 (compiled `src/input.css` → `dist/output.css` via PostCSS) plus a hand-written token layer in `src/theme.css`. We add a fluid type scale to the base layer so `h1/h2/h3/p` size themselves, then strip the now-redundant utility classes from the HTML, dedupe the social SVGs to `currentColor`, and extract the copy-pasted sidebar + scripts into a single JS-injected partial. No new build dependencies — everything compiles through the existing `npm run build-css`.

**Tech Stack:** HTML, Tailwind CSS v3, PostCSS, CSS custom properties + `clamp()`, vanilla JS.

## Global Constraints

- **No new build tooling.** Only `postcss` / `npm run build-css` already in `package.json`. No 11ty, no framework.
- **Never hand-edit `dist/output.css`** — it is generated. All CSS changes go in `src/theme.css` or `src/input.css`, then rebuild.
- **Palette is fixed** and lives as CSS variables in `src/theme.css`: `--color-van-dyke #3E1F14`, `--color-caramel #BE7C4D`, `--color-jasper #BE5A38`, `--color-isabelline #F2E9E4`. Reuse variables, never re-hardcode hex.
- **Heading font** is `Young Serif` (already `font-family: var(--font-serif-display)` on `h1,h2,h3` in theme.css). Body font is `Cormorant Garamond`.
- **Dark mode** is driven by a `.dark` class on a root element; every color must resolve through the existing variables so both themes work.
- **Verification is visual, not unit-tested** — this is a static CSS site with no test runner. Each task is verified by running `npm run build-css` and viewing the affected page(s) in a browser in both light and dark mode.
- **Pages in scope for shared chrome:** `index.html`, `projects/morphic.html`, `projects/noeron.html`, `projects/st-pete.html`. `resume.html` has its own simpler layout and is out of scope for the chrome refactor.

---

## File Structure

- `src/theme.css` — tokens + base element typography. Gains the type-scale variables and `h1/h2/h3/p` size defaults; loses the aggressive `p { font-size: 2rem }` and global `a` rules.
- `src/input.css` — reusable component classes. Gains a `.lead` class for intro paragraphs and a `.caption`/small helper.
- `assets/js/site-chrome.js` — **new.** Renders the shared sidebar + mobile bar, injects the social SVGs once (using `currentColor`), and wires the dark-mode toggle + mobile drawer. Replaces the per-page copy-paste.
- `assets/img/icons/` (optional) — if we externalize SVGs; for this plan we keep them inline in `site-chrome.js`.
- `index.html`, `projects/*.html` — lose redundant `font-libre` + `text-*` heading/paragraph utilities; lose the duplicated `<aside>` / toggle button / `<script>` blocks in favor of `<div id="site-chrome">` + one script tag.
- **Deleted:** `syllabus.html`, `syllabus-phase3.html`, `multiomics-syllabus.html` and any nav links pointing at them.

---

## Phase 1 — Delete dead pages & remove redundant heading font class

### Task 1: Delete the syllabus pages and their references

**Files:**
- Delete: `syllabus.html`, `syllabus-phase3.html`, `multiomics-syllabus.html`
- Modify: any file linking to them (search first)

- [ ] **Step 1: Find every reference to the syllabus pages**

```bash
cd /Users/beckpiscopo/Desktop/dev/portfolio-site
grep -rn "syllabus" --include=*.html --include=*.js .
```
Expected: a list of `href="...syllabus*.html"` occurrences (likely in `index.html`'s Writing/Projects list) plus the files themselves.

- [ ] **Step 2: Delete the three pages**

```bash
git rm syllabus.html syllabus-phase3.html multiomics-syllabus.html
```

- [ ] **Step 3: Remove any links to them**

For each `href="...syllabus*.html"` found in Step 1 (outside the deleted files), delete the containing list item / link in that HTML file. If unsure whether a link is content the user wants kept, leave a one-line note in the commit body rather than guessing.

- [ ] **Step 4: Verify no dangling references remain**

```bash
grep -rn "syllabus" --include=*.html --include=*.js . || echo "clean"
```
Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove syllabus pages and their nav links"
```

### Task 2: Drop redundant `font-libre` from headings

`theme.css` already sets `h1,h2,h3 { font-family: var(--font-serif-display) }` (Young Serif), so `class="font-libre"` on headings is a no-op duplicate applied 44 times. Removing it makes the heading font a true default.

**Files:**
- Modify: `index.html`, `projects/morphic.html`, `projects/noeron.html`, `projects/st-pete.html`, `resume.html`

- [ ] **Step 1: Confirm headings are the only `font-libre` consumers**

```bash
grep -rnoE '[^ ]*font-libre[^"]*' --include=*.html . | grep -vE '<h[1-6]' | head
```
Expected: ideally empty. If `font-libre` appears on a non-heading (e.g. the sidebar name `<a>`), note those — they should keep an explicit font and are handled in Step 3, not blanket-removed.

- [ ] **Step 2: Remove `font-libre` from heading tags only**

In each HTML file, for every `<h1>`–`<h3>` with `class="font-libre ..."`, delete just the `font-libre ` token (keep the other utilities). Do this heading by heading; do not touch non-heading elements.

- [ ] **Step 3: Re-add an explicit heading font where a non-heading relied on `font-libre`**

For any non-heading flagged in Step 1 (e.g. the "Beck Piscopo" sidebar link), replace `font-libre` with `style="font-family: var(--font-serif-display)"` or a small `.font-display` utility added to `src/input.css`:

```css
/* src/input.css — explicit display-font helper for non-heading elements */
.font-display { font-family: var(--font-serif-display); }
```

- [ ] **Step 4: Rebuild and visually verify headings still render in Young Serif**

```bash
npm run build-css
```
Open `index.html` and one project page in a browser. Expected: headings unchanged (still Young Serif); the sidebar name still uses the display font.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(css): drop redundant font-libre from headings, rely on base font"
```

---

## Phase 2 — Typographic scale (the core fix)

### Task 3: Add the fluid type-scale tokens and base sizing

This is the change that ends manual size-picking. We define a fluid modular scale and apply it as defaults to `h1/h2/h3/p`. Tailwind `text-*` utilities still win **when present**, so existing pages won't break — but once utilities are stripped (Task 4) the defaults take over.

**Files:**
- Modify: `src/theme.css` (replace the existing `p { font-size: 2rem }` block and add scale variables)

- [ ] **Step 1: Add scale variables to `:root` in `src/theme.css`**

Insert inside the existing `:root { ... }` block (after the color/font vars):

```css
  /* Fluid type scale (mobile -> desktop via clamp; ~1.25 modular ratio) */
  --step--1: clamp(0.94rem, 0.90rem + 0.20vw, 1.05rem); /* captions, meta */
  --step-0:  clamp(1.10rem, 1.02rem + 0.40vw, 1.30rem); /* body copy      */
  --step-1:  clamp(1.40rem, 1.20rem + 0.70vw, 1.70rem); /* lead / h3      */
  --step-2:  clamp(1.75rem, 1.45rem + 1.10vw, 2.20rem); /* h2             */
  --step-3:  clamp(2.20rem, 1.70rem + 2.00vw, 3.20rem); /* h1 / display   */
```

- [ ] **Step 2: Replace the global element typography in `src/theme.css`**

Find the existing block:

```css
ol, ul, p, a {
  font-family: var(--font-serif-body);
}


p {
  font-size: 2rem;
  color: var(--color-text);
}

a {
  text-decoration: underline;
  padding: 4px;
}

a:hover, a:active {
  color: var(--color-link-hover-text);
}
```

Replace it with:

```css
ol, ul, p {
  font-family: var(--font-serif-body);
}

/* Base typographic scale — elements size themselves; utilities still override */
h1 { font-size: var(--step-3); line-height: 1.08; }
h2 { font-size: var(--step-2); line-height: 1.15; }
h3 { font-size: var(--step-1); line-height: 1.20; }

p {
  font-size: var(--step-0);
  line-height: 1.6;
  color: var(--color-text);
}

li { font-size: var(--step-0); line-height: 1.6; }
```

Note: the global `a { text-decoration: underline; padding: 4px }` and `a:hover` rules are intentionally dropped here — link styling already lives in the scoped `.link` and `nav a` rules (input.css / theme.css), and the global version was causing whack-a-mole. Nav and body links are verified in Task 6.

- [ ] **Step 3: Add `.lead` and `.caption` helpers to `src/input.css`**

Add near the "Editorial accents" section:

```css
/* ---- Typographic helpers ---- */
/* Intro / subtitle paragraphs (replaces hand-picked text-2xl italic) */
.lead { font-size: var(--step-1); line-height: 1.4; opacity: 0.85; }
/* Small print: captions, metadata labels */
.caption { font-size: var(--step--1); opacity: 0.6; }
```

- [ ] **Step 4: Rebuild**

```bash
npm run build-css
```
Expected: build succeeds, `dist/output.css` regenerated.

- [ ] **Step 5: Commit**

```bash
git add src/theme.css src/input.css dist/output.css
git commit -m "feat(css): add fluid type scale with semantic base sizing"
```

### Task 4: Migrate one page (`projects/st-pete.html`) off manual sizes — the pilot

Do the densest page first to prove the scale, then repeat the pattern on the others. This page currently uses `text-xl` on body paragraphs/list items, `text-2xl italic` on the intro, and `text-3xl`/`text-4xl md:text-5xl` on headings.

**Files:**
- Modify: `projects/st-pete.html`

- [ ] **Step 1: Convert the intro/subtitle paragraph to `.lead`**

Find the subtitle `<p class="text-2xl italic opacity-80 mb-8 max-w-3xl">` and change it to `<p class="lead italic mb-8 max-w-3xl">` (drop `text-2xl` and `opacity-80`; `.lead` supplies both).

- [ ] **Step 2: Strip `text-*` from headings**

For each `<h1>`/`<h2>`/`<h3>`, remove the size utilities (`text-3xl`, `text-4xl`, `md:text-5xl`, `text-2xl`, etc.) and keep only structural/spacing utilities (`font-bold`, `mb-*`, `max-w-*`). The base scale now sizes them.

- [ ] **Step 3: Strip `text-xl` from body paragraphs and list items**

Remove `text-xl` from `<p>` and `<li>` elements that are plain body copy; `--step-0` is now the default. Keep `text-sm`/`text-lg` only where an element is *intentionally* off the body size (e.g. the `dt`/`dd` metadata — leave those, or move them to `.caption` if they match small print).

- [ ] **Step 4: Rebuild and verify in browser (light + dark)**

```bash
npm run build-css
```
Open `projects/st-pete.html`. Expected: headings and body text size automatically and look consistent with the previous design; nothing collapses to tiny/huge. Toggle dark mode and confirm colors still resolve.

- [ ] **Step 5: Commit**

```bash
git add projects/st-pete.html dist/output.css
git commit -m "refactor(st-pete): use type scale instead of manual text utilities"
```

### Task 5: Migrate the remaining pages off manual sizes

Repeat the Task 4 pattern on the other content pages now that the scale is proven.

**Files:**
- Modify: `index.html`, `projects/morphic.html`, `projects/noeron.html`, `resume.html`

- [ ] **Step 1: For each file, apply the same three substitutions as Task 4**
  - Intro/subtitle `<p>` → `.lead`
  - Headings: remove `text-*`/`md:text-*` size utilities, keep weight/spacing
  - Body `<p>`/`<li>`: remove `text-xl`/`text-2xl` size utilities
  - Leave deliberately-small UI text (`text-sm` labels, badges) alone

- [ ] **Step 2: Rebuild**

```bash
npm run build-css
```

- [ ] **Step 3: Verify every page in browser, light + dark**

Open `index.html`, `projects/morphic.html`, `projects/noeron.html`, `resume.html`. Expected: consistent typography across all pages; no element mis-sized; dark mode intact.

- [ ] **Step 4: Confirm no stray manual sizes remain on body content**

```bash
grep -rnoE '<(h[1-3]|p)[^>]*\btext-(xl|2xl|3xl|4xl|5xl|6xl)\b' --include=*.html . || echo "clean"
```
Expected: `clean`, or only intentional exceptions you can justify (note them in the commit).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(css): migrate all pages to the type scale"
```

### Task 6: Verify link styling survived the global-rule removal

We dropped the global `a` rules in Task 3. Confirm nav links and body `.link`s still look right.

**Files:**
- Modify (only if needed): `src/input.css` or `src/theme.css`

- [ ] **Step 1: Audit links in the browser**

Open `index.html` and a project page. Check: nav/sidebar links (hover background = caramel), inline body `.link`s (jasper, underlined), the "← Projects" back link. Toggle dark mode.

- [ ] **Step 2: If any link lost styling, scope a fix (do not restore the global rule)**

If plain body `<a>` without `.link` now looks unstyled and should be styled, add a scoped rule rather than a global one, e.g. in `src/input.css`:

```css
/* Body prose links inside main content (scoped, not global) */
main a:not(.link):not(.toc a) { color: var(--color-jasper); text-decoration: underline; text-underline-offset: 2px; }
```
Only add this if an actual unstyled link is found. Rebuild after editing.

- [ ] **Step 3: Commit (if changed)**

```bash
npm run build-css
git add -A
git commit -m "fix(css): scope body link styling after removing global a rule"
```

---

## Phase 3 — Dedupe SVGs and inline styles

### Task 7: Collapse the dark/light social SVGs into single `currentColor` icons

Each social icon currently ships twice (`block dark:hidden` + `hidden dark:block`) with hardcoded `#3E1F14`/`#F2E9E4`. `theme.css` already does `svg { fill: currentColor }` and `.dark svg { color }`, so one icon driven by text color suffices.

**Files:**
- Modify: `index.html`, `projects/morphic.html`, `projects/noeron.html`, `projects/st-pete.html`
- (This task is partially superseded by Task 9 if the chrome is extracted to JS — do whichever order you execute, but the single-SVG markup is what lands in `site-chrome.js`.)

- [ ] **Step 1: For one icon (GitHub), replace the two-SVG block with one**

Replace:

```html
<svg class="w-7 h-7 block dark:hidden" viewBox="0 0 250 250" fill="#3E1F14"> ...path fill="#3E1F14".../></svg>
<svg class="w-7 h-7 hidden dark:block" viewBox="0 0 250 250" fill="#F2E9E4"> ...path fill="#F2E9E4".../></svg>
```

with a single icon that inherits text color:

```html
<svg class="w-7 h-7" viewBox="0 0 250 250" aria-hidden="true"><path d="...same path data..." fill="currentColor"/></svg>
```
(Remove the per-`<path>` hardcoded `fill` so `currentColor` flows through. The `scale:0.6` inline style on the Paragraph icon can move to a `class` or stay — note it for Step 4.)

- [ ] **Step 2: Repeat for the X and Paragraph icons**

- [ ] **Step 3: Verify icons render and recolor with the theme**

Open a page, toggle dark mode. Expected: each social icon shows once and switches color (van-dyke in light, isabelline in dark) automatically.

- [ ] **Step 4: Replace the repeated `style="scale:0.6;"` with a utility**

Add to `src/input.css`:

```css
.icon-paragraph { transform: scale(0.6); }
```
and swap `style="scale:0.6;"` → `class="... icon-paragraph"` on the Paragraph SVGs. Rebuild.

- [ ] **Step 5: Commit**

```bash
npm run build-css
git add -A
git commit -m "refactor(svg): single currentColor social icons, drop inline scale"
```

---

## Phase 4 — Globalize the shared chrome (optional but high-value)

### Task 8: Build the shared chrome partial

Extract the sidebar + mobile bar + toggle button + the two duplicated `<script>` blocks into one JS module that injects them, so the four pages stop carrying ~80 lines of identical markup each.

**Files:**
- Create: `assets/js/site-chrome.js`

- [ ] **Step 1: Capture the canonical chrome markup**

From `projects/st-pete.html`, copy the `<button id="dark-toggle">`, `<header id="mobile-bar">`, and `<aside id="sidebar">` blocks (using the single-SVG icons from Task 7) and the two inline `<script>` blocks (dark-mode toggle logic + mobile drawer logic).

- [ ] **Step 2: Write `assets/js/site-chrome.js`**

```js
// Renders the shared sidebar/topbar/toggle and wires interactions.
// Pages opt in with: <div id="site-chrome" data-base="../"></div><script src="../assets/js/site-chrome.js"></script>
(function () {
  const mount = document.getElementById('site-chrome');
  if (!mount) return;
  const base = mount.dataset.base || ''; // '' on index.html, '../' on project pages

  mount.innerHTML = `
    <button id="dark-toggle" aria-label="Toggle dark mode" class="theme-toggle-fixed"> ...single-SVG toggle... </button>
    <header id="mobile-bar" class="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 backdrop-blur">
      <a href="${base}index.html" class="font-display text-xl font-bold">Beck Piscopo</a>
      <button id="menu-toggle" aria-label="Open menu" aria-expanded="false" class="p-2 text-3xl leading-none">&#9776;</button>
    </header>
    <aside id="sidebar" class="fixed z-50 top-0 left-0 h-screen w-64 px-6 py-8 flex flex-col gap-8 -translate-x-full md:translate-x-0 transition-transform duration-300">
      ...sidebar markup with ${base} prefixed on every href and the single-SVG social icons...
    </aside>`;

  // Dark-mode toggle (ported verbatim from the inline block)
  const darkToggle = document.getElementById('dark-toggle');
  // ...same logic...

  // Mobile drawer (ported verbatim)
  const menuToggle = document.getElementById('menu-toggle');
  // ...same logic...
})();
```
Fill the `...` with the real markup/logic from Step 1. Every internal link uses the `${base}` prefix so the same file works from `/` and `/projects/`.

- [ ] **Step 3: Manually verify the script in isolation on one page (Task 9 does the real swap)**

Temporarily add `<div id="site-chrome" data-base="../"></div>` + the script tag to a scratch copy of `st-pete.html` and confirm the sidebar renders, links work, toggle + drawer function. Discard the scratch copy.

- [ ] **Step 4: Commit**

```bash
git add assets/js/site-chrome.js
git commit -m "feat: shared site-chrome partial (sidebar, topbar, toggle, drawer)"
```

### Task 9: Replace per-page chrome with the partial

**Files:**
- Modify: `index.html` (`data-base=""`), `projects/morphic.html`, `projects/noeron.html`, `projects/st-pete.html` (`data-base="../"`)

- [ ] **Step 1: On `projects/st-pete.html`, delete the inline chrome**

Remove the `<button id="dark-toggle">`, `<header id="mobile-bar">`, `<aside id="sidebar">` blocks and the two now-duplicated `<script>` blocks (toggle + drawer). Keep the Flowbite and Vercel `<script>` tags.

- [ ] **Step 2: Insert the partial mount + script**

At the top of `<body>`:
```html
<div id="site-chrome" data-base="../"></div>
```
Before `</body>` (before the Flowbite script):
```html
<script src="../assets/js/site-chrome.js"></script>
```

- [ ] **Step 3: Rebuild + verify st-pete in browser (light + dark, mobile + desktop)**

```bash
npm run build-css
```
Expected: sidebar, mobile drawer, and toggle all work identically to before; links resolve to `../index.html#...`.

- [ ] **Step 4: Repeat for morphic, noeron (`data-base="../"`) and index.html (`data-base=""`)**

For `index.html`, mount with `data-base=""` and load `assets/js/site-chrome.js` (no `../`).

- [ ] **Step 5: Confirm the duplication is gone**

```bash
grep -rln 'id="sidebar"' --include=*.html . | grep -v node_modules
```
Expected: empty (sidebar now lives only in `site-chrome.js`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: replace per-page chrome with shared site-chrome partial"
```

---

## Self-Review Notes

- **Stated pain ("manually choose sizing")** → Tasks 3–5 (type scale + migration). ✓
- **Delete syllabus pages** → Task 1. ✓
- **"Not globalized" / messy** → Task 2 (redundant font class), Task 7 (SVG dedup), Tasks 8–9 (chrome dedup). ✓
- **Double-Tailwind risk** → resolved for free by Task 1 (those were the only CDN-Tailwind pages). ✓
- **Phasing:** Phases 1–2 deliver the headline win and are independently shippable. Phase 3 is pure cleanup. Phase 4 is the larger structural change and can be deferred without blocking anything earlier.
- **Risk:** stripping utilities (Tasks 4–5) is broad; the pilot-then-repeat order and the `grep` guards in Steps 4/5 catch stragglers. Base defaults are additive, so a missed utility simply keeps its old explicit size rather than breaking.
