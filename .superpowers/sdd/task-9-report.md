# Task 9 Report — Cleanup, DESIGN.md, final verification

## Status: COMPLETE

**Commit:** _(see below)_ — `feat(site): research-document homepage refresh — cleanup and docs`

---

## Step 1: Dead-code sweep

**`src/input.css`** — Removed the entire `/* ---- Hero "handwritten" reveal ---- */` block (44 lines):
- `.hero-handwrite` rule (with `font-family: 'Cormorant Garamond', serif`)
- `.hero-handwrite .hw-text` (clip-path animation)
- `.hero-handwrite::after` (travelling pen tip)
- `.dark .hero-handwrite::after`
- `@keyframes hw-reveal`
- `@keyframes hw-pen`
- The `prefers-reduced-motion` override block for those selectors

**`index.html`** — Verified clean: no Cormorant, flowbite, hero-handwrite, or hw-text references.

---

## Step 2: DESIGN.md updates

Added/updated the following sections in `DESIGN.md`:

- **Typography table** — Added IBM Plex Mono apparatus row (`.68rem`, `.14em` tracking, uppercase, `--font-mono` variable). Added retirement note for Cormorant Garamond and typewriter effect.
- **Color palette / Accent-variable system** — Documented that all emphasis routes through `--accent` / `--accent-l` / `--accent-d`; jasper is current ink; `--color-jasper` aliased to `--accent` for backward compat.
- **Color palette / Plate browns** — Documented `--plate-abstract` (`#24110A` / `#1B0C05`) and `--plate-footer` (`#3E1F14` / `#1C0D06`) as theme-invariant tokens.
- **New section: Document apparatus** — Covers figure captions (`Fig. N — …`), plate numbering (`Plate I–V`), section eyebrows (`NN — LABEL`), colophon (`DOC REF` / `CURRENT WORK` / `FIELD NOTES`), day/night toggle (`◐`/`◑`, `bp-theme` localStorage key).
- **One-line summary** — Updated to reflect current state (Cormorant removed, IBM Plex Mono added, research-document language noted).

---

## Step 3: CSS build + cache-buster

- `npm run build-css` — rebuilt `dist/output.css` after typewriter-style removal.
- Cache-buster bumped from `?v=20260707a` to `?v=20260708a` on:
  - `index.html`
  - `projects/morphic.html`
  - `projects/noeron.html`
  - `projects/st-pete.html`
  - `projects/tampa-labor.html`

---

## Step 4: Full verification pass

**Server:** `python3 -m http.server 8908` from repo root.
**Script:** `/private/tmp/claude-501/-Users-beckpiscopo-Desktop-dev-portfolio-site/0c4b6d9b-dda6-4ea6-8241-3b8375bd2747/scratchpad/verify-task9.mjs`
**Chrome:** `$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-x64/chrome-headless-shell`

### Results: 37/37 PASS

| Group | Checks | Result |
|-------|--------|--------|
| 1440×900 light — sections, errors, 3 canvases | 5 | PASS |
| 1440×900 dark — sections, errors, 3 canvases | 5 | PASS |
| 390×844 light — sections, errors, 3 canvases | 5 | PASS |
| 390×844 dark — sections, errors, 3 canvases | 5 | PASS |
| Toggle live — dark class, #net recolor, localStorage, no errors | 4 | PASS |
| Reduced-motion 1440×900 light — sections, errors, 3 canvases | 5 | PASS |
| Project pages (morphic, noeron, st-pete, tampa-labor) — errors + meta-top | 8 | PASS |

**Notable pixel counts:**
- `#net` (Fig. 1): 63,777 px (light) / 70,267 px (dark) — recolors confirmed by pixel diff
- `#atmo` (Abstract plate): 25,217 px at 1440 (both themes)
- `#orbit` (Footer): 14,112 px (light) / 14,079 px (dark) at 1440

---

## Step 5: Screenshot archive

Full-page screenshots at 1440×900 saved to `docs/superpowers/specs/assets/`:
- `2026-07-08-homepage-light.png` (300 KB)
- `2026-07-08-homepage-dark.png` (269 KB)

---

## Concerns

None. The only console errors observed during the entire test run were the expected `/_vercel/insights/script.js` 404 (filtered), which is absent in local dev and handled gracefully.

---

# Final-Review Fixes — 2026-07-08

**Commit:** _(see below)_ — `fix(site): dark-mode ink routing, project anchors, docs, screenshot archive`

---

## Finding 1: Dark-mode invisible ink (Critical)

**Root cause:** `src/document.css` used `var(--color-van-dyke)` directly for text/ink on theme-following surfaces. Under `.dark` the `--color-background` flips to `#3E1F14` but `--color-van-dyke` stays `#3E1F14` (intentionally — heatmap and footer depend on the literal), producing brown-on-brown invisible ink.

**Fix:** Introduced a scoped routing variable at the top of `src/document.css`:
```css
:root { --doc-ink: var(--color-van-dyke); }
.dark  { --doc-ink: var(--color-isabelline); }
```

Routed the following rules through `var(--doc-ink)`:

| Selector | Property changed |
|----------|-----------------|
| `.mono` | `color-mix(…var(--color-van-dyke) 68%…)` → `var(--doc-ink)` |
| `.meta-top .lockup` | `color` |
| `.subline` | `color-mix(…var(--color-van-dyke) 62%…)` → `var(--doc-ink)` |
| `.cta` | `color` |
| `.cta:hover` | `background` and `color: var(--color-isabelline)` → `color: var(--color-background)` |
| `.plate p` | `color-mix(…var(--color-van-dyke) 82%…)` → `var(--doc-ink)` |
| `.refs .sub` | `color-mix(…var(--color-van-dyke) 62%…)` → `var(--doc-ink)` |
| `.refs .year` | `color-mix(…var(--color-van-dyke) 55%…)` → `var(--doc-ink)` |
| `.theme-toggle` | `color` |
| `.plate .thumb-placeholder` | `color-mix(…var(--color-van-dyke) 40%…)` → `var(--doc-ink)` |

**Left untouched (intentionally):**
- `.abstract .detail p` and `.origins li` — live inside `#abstract` which scopes `--color-van-dyke: #F2E9E4` already
- `.footer-cta .cta:hover { color: var(--color-van-dyke) }` — footer literal (correct, always night-context)
- `#abstract { --color-van-dyke: #F2E9E4 }` — the scoped block itself
- `.dark .mono` explicit override — left in place (no conflict, redundant but harmless)
- `src/input.css` heatmap rules — not touched

---

## Finding 2: Broken anchors (Important)

Replaced all `href="/#projects"` → `href="/#work"` in:
- `projects/noeron.html` (2 anchors: breadcrumb + footer)
- `projects/morphic.html` (2 anchors)
- `projects/st-pete.html` (2 anchors)
- `projects/tampa-labor.html` (2 anchors)

**8 total anchors updated.**

---

## Finding 3: DESIGN.md corrections

| Location | Before | After |
|----------|--------|-------|
| Day/night toggle section | `site.js` reads the `bp-theme` key | `theme.js` reads the `bp-theme` key |
| Colophon example | `BP-2026-07` | `BP-2026` |
| Section eyebrows example | `02 — FIELD NOTES` | `02 — Plates I–V` |

---

## Finding 4: CSS rebuild + cache-buster + screenshots

**CSS rebuild:** `npm run build-css` — rebuilt `dist/output.css` with `--doc-ink` variable routing.

**Cache-buster:** bumped `?v=20260708a` → `?v=20260708b` on `output.css` reference in:
- `index.html`
- `projects/noeron.html`
- `projects/morphic.html`
- `projects/st-pete.html`
- `projects/tampa-labor.html`

**Screenshots re-captured** (full-page, 1440×900, Playwright + headless Chromium, port 8909):
- `docs/superpowers/specs/assets/2026-07-08-homepage-light.png`
- `docs/superpowers/specs/assets/2026-07-08-homepage-dark.png`

Capture method: set `localStorage['bp-theme']` via `addInitScript`, `networkidle` load, scroll down in steps (800px × 7 iterations with 200ms waits + final bottom scroll), verify all 10/10 `.reveal.visible`, scroll back to top, wait 800ms, `fullPage: true` screenshot.

---

## Verification Results

| Check | Result |
|-------|--------|
| Dark mode `.lockup` color | PASS — `rgb(242, 233, 228)` |
| Dark mode `.subline` color | PASS — `color(srgb 0.94902 0.913725 0.894118 / 0.62)` (isabelline @ 62% opacity — by design) |
| Dark mode `.cta` color | PASS — `rgb(242, 233, 228)` |
| Dark mode `.theme-toggle` color | PASS — `rgb(242, 233, 228)` |
| Light mode `.lockup` color | PASS — `rgb(62, 31, 20)` (van-dyke) |
| Light mode `.theme-toggle` color | PASS — `rgb(62, 31, 20)` (van-dyke) |
| Heatmap `.lvl-4` light mode | PASS — `rgb(62, 31, 20)` (van-dyke, not regressed) |
| Heatmap `.lvl-4` dark mode | PASS — `rgb(242, 233, 228)` (isabelline, not regressed) |
| All 10/10 `.reveal.visible` before capture (both themes) | PASS |
| All 8 project-page anchors → `/#work` | PASS |
| Console errors | PASS — only `/_vercel/insights/script.js` 404 (expected) |
| DESIGN.md `theme.js` reference | PASS |
| DESIGN.md colophon `BP-2026` | PASS |
| DESIGN.md eyebrow `02 — Plates I–V` | PASS |

**Note on `.subline`:** The `color-mix(in srgb, var(--doc-ink) 62%, transparent)` expression intentionally produces semi-transparent isabelline in dark mode (62% opacity over the dark `#3E1F14` background). The color is visually correct and fully readable — `0.94902/0.913725/0.894118` are the exact sRGB channels for `#F2E9E4 = rgb(242, 233, 228)`.

---

## Concerns

None. All checks pass. The only 404 is the expected Vercel insights script (absent in local dev, handled gracefully by the script tag).

---

# Defect Fix — 2026-07-08 (Task 9 Continuation)

**Commit:** `4e65d8f` — `fix(home): footer paragraph ink invisible in light mode`

---

## Issue: Footer paragraphs invisible in LIGHT mode

**Root cause:** `theme.css` has `p { color: var(--color-text) }` which directly targets all paragraphs, overriding inherited color. The `.footer` (a theme-invariant dark plate) does not override `--color-text` locally. In LIGHT mode, `--color-text` resolves to a light color on a dark background (invisible), while in DARK mode the same variable produces the correct appearance by chance.

**The fix (scoped override):** In `src/document.css`, inside the `.footer {` rule block (line 284), added:
```css
--color-text: #F2E9E4;
```

This scopes the variable override so footer paragraphs (`.footer-cta .big`) render in isabelline regardless of theme mode — matching the footer's invariant dark-plate design.

**Pattern:** This approach mirrors the existing `#abstract { --color-text: #F2E9E4 }` override already in the stylesheet.

---

## Verification (Playwright, port 8910)

| Mode | Element | Computed Color | Expected | Status |
|------|---------|---|---|---|
| LIGHT | `.footer-cta .big` | `rgb(242, 233, 228)` | `rgb(242, 233, 228)` | PASS |
| DARK | `.footer-cta .big` | `rgb(242, 233, 228)` | `rgb(242, 233, 228)` | PASS |

---

## Files changed

- **`src/document.css`** — Added `--color-text: #F2E9E4;` to `.footer` rule (line 285)
- **`dist/output.css`** — Rebuilt via `npm run build-css`
- **Cache-busters** — Bumped `?v=20260708b` → `?v=20260708c` on:
  - `index.html`
  - `projects/noeron.html`
  - `projects/morphic.html`
  - `projects/st-pete.html`
  - `projects/tampa-labor.html`

---

## Concerns

None. Footer ink renders correctly in both light and dark modes.

---

# Mobile Viewport Inflation Fix — 2026-07-08

**Commit:** _(see below)_ — `fix(home): mobile viewport inflation; static header and stacked colophon on small screens`

---

## Diagnosed Problem

At 390px device width the homepage layout viewport inflated to ~492px (Playwright isMobile measurement: `innerWidth=492`, `scrollWidth=492`). No single element wider than the layout viewport — the viewport itself grew due to min-content width pressure from non-wrapping content.

## Root Causes Found (all confirmed by before/after measurement)

| Cause | Details |
|-------|---------|
| `.figure-caption .legend { white-space: nowrap }` | Long legend text "▲ WHAT MATTERS / cursor — gather · click — add observation" forced the caption's flex row min-content width past 390px. Primary offender. |
| `.meta-top .nav { gap: 1.6rem }` + `.pageno { margin-left: 1.4rem }` | Five nav links at 1.6rem gaps plus pageno margin accumulated to overflow 390px minus header padding. |
| `.colophon { grid-template-columns: 1fr 2fr 1fr }` | Three-column grid with long CURRENT WORK cell would force width on narrower screens. |
| `.meta-top { position: sticky }` | At 390px the header wraps to ~3 rows (~135px); sticking it is a UX problem. |

## Fixes Applied (`src/document.css`, `@media (max-width: 720px)` block)

```css
/* Header: non-sticky on small screens */
.meta-top { position: static; }

/* Nav: tighten gap/font-size */
.meta-top .nav { gap: .9rem; }
.meta-top .nav a { font-size: .62rem; }

/* Page number: hide on small screens (desktop nicety) */
.pageno { display: none; }

/* Figure caption: allow wrapping */
.figure-caption { flex-wrap: wrap; }
.figure-caption .legend { white-space: normal; text-align: left; }

/* Colophon: stack to 1 column */
.colophon { grid-template-columns: 1fr; }
.colophon > div + div { border-left: none; border-top: 1px solid rgba(242,233,228,.14); }
.colophon > div:last-child { text-align: left; }
```

## Before / After Measurements (Playwright isMobile, 390×844)

| Page | Before innerWidth | Before scrollWidth | After innerWidth | After scrollWidth | Status |
|------|------------------|--------------------|-----------------|-------------------|--------|
| homepage (top) | 492 | 492 | 390 | 390 | PASS |
| homepage (bottom / footer) | 492 | 492 | 390 | 390 | PASS |
| noeron | 390 | 390 | 390 | 390 | PASS (unchanged) |
| morphic | 390 | 390 | 390 | 390 | PASS (unchanged) |
| st-pete | 390 | 390 | 390 | 390 | PASS (unchanged) |
| tampa-labor | 390 | 390 | 390 | 390 | PASS (unchanged) |

## Desktop Regression Check (1440×900)

| Property | Expected | Actual | Status |
|----------|----------|--------|--------|
| `.meta-top` position | sticky | sticky | PASS |
| `.pageno` display | block (visible) | block | PASS |
| `.legend` white-space | nowrap | nowrap | PASS |
| `.colophon` grid-template-columns | 3-column | 360px 720px 360px | PASS |

## Files Changed

- **`src/document.css`** — Expanded `@media (max-width: 720px)` block with 9 new rules
- **`dist/output.css`** — Rebuilt via `npm run build-css`
- **Cache-busters** — Bumped `?v=20260708c` → `?v=20260708d` on:
  - `index.html`
  - `projects/noeron.html`
  - `projects/morphic.html`
  - `projects/st-pete.html`
  - `projects/tampa-labor.html`
- **`docs/superpowers/specs/assets/2026-07-08-homepage-mobile.png`** — New 390×844 hero screenshot (2× devicePixelRatio)

## Concerns

None. All 6 pages pass at 390px isMobile. Desktop layout unchanged.
