# Design Reference — beckpiscopo.xyz

Quick reference for keeping any material (dashboards, decks, charts, social) coherent with the portfolio site. Source of truth: `src/theme.css` (`:root`) and `src/input.css`.

---

## Color palette

Four-color warm/earthy palette. These four are the whole brand — everything else is a tint or a role mapping.

| Name | Hex | RGB | Role |
|------|-----|-----|------|
| **Van Dyke** (brown) | `#3E1F14` | `62, 31, 20` | Primary text (light mode) · background (dark mode) · darkest anchor |
| **Caramel** | `#BE7C4D` | `190, 124, 77` | Hover/accent surfaces · secondary warm tone · mid-ramp |
| **Jasper** (terracotta) | `#BE5A38` | `190, 90, 56` | Emphasis: links, italic accents, key data points |
| **Isabelline** (cream) | `#F2E9E4` | `242, 233, 228` | Background (light mode) · text (dark mode) · lightest tone |

### Light vs dark roles

| Token | Light mode | Dark mode |
|-------|-----------|-----------|
| Background | Isabelline `#F2E9E4` | Van Dyke `#3E1F14` |
| Text | Van Dyke `#3E1F14` | Isabelline `#F2E9E4` |
| Nav links | Van Dyke `#3E1F14` | Caramel `#BE7C4D` |
| Link/accent (emphasis) | Jasper `#BE5A38` | Caramel `#BE7C4D` |
| Link hover bg / text | Caramel bg / Isabelline text | Caramel bg / Van Dyke text |
| Text selection | bg Caramel `#BE7C4D`, text Isabelline `#F2E9E4` | same |

**Rule of thumb:** in light mode, *jasper* carries emphasis; in dark mode, *caramel* takes over (jasper gets muddy on the dark brown).

### Accent-variable system (2026-07 homepage refresh)

All emphasis colors route through `--accent` / `--accent-l` / `--accent-d` (defined in `src/theme.css`). Jasper is the current ink (`--accent-l: #BE5A38`; dark: `--accent-d: #BE7C4D`). The legacy `--color-jasper` variable is aliased to `--accent` so old styles follow any future ink swap automatically.

### Plate browns

Dark-background "plate" sections use two theme-invariant tokens (they do not flip in light mode — both stay night-dark):

| Token | Light value | Dark value | Used for |
|-------|------------|-----------|---------|
| `--plate-abstract` | `#24110A` | `#1B0C05` | Abstract section dark plate |
| `--plate-footer` | `#3E1F14` | `#1C0D06` | Footer / contact plate |

---

## For Tableau / external charts

Tableau accepts hex directly (Edit Colors → custom). Suggested derivations from the brand palette:

**Categorical (distinct series)** — order by salience:
1. Jasper `#BE5A38` (primary / the thing you want noticed)
2. Caramel `#BE7C4D` (secondary)
3. Van Dyke `#3E1F14` (anchor / totals)
4. (neutral filler) a muted taupe like `#9B8579` or `#C9B8AD` if you need a 4th that won't compete

**Sequential ramp (low → high)** — the warm ramp the site uses for its contribution heatmap, flattened to solid stops:
`#F2E9E4` → `#BE7C4D` → `#BE5A38` → `#3E1F14`
(cream → caramel → jasper → van dyke). Good for intensity/density. Set the chart background to Isabelline `#F2E9E4` so the lightest step reads as "near-zero," matching the site.

**Diverging** — the palette isn't built for true diverging (no cool counter-hue). If you need one, pair Jasper `#BE5A38` (high) against a desaturated slate like `#5B6B6E` (low) with Isabelline `#F2E9E4` at the midpoint, and treat it as off-brand-but-compatible.

**Backgrounds:** use Isabelline `#F2E9E4` for light, Van Dyke `#3E1F14` for dark — not pure white/black. Gridlines/borders: a faint version of the text color (~14–20% opacity), e.g. van dyke at ~15% (`rgba(62,31,20,0.15)`).

---

## Typography

| Use | Font | Notes |
|-----|------|-------|
| Display / headings (h1–h3) | **Young Serif** | Chunky slab-ish serif. Headings, big numbers, the name lockup. |
| Body / UI / nav / lists / tables | **Hanken Grotesk** | Warm humanist sans. Chosen for readability at body sizes. Weights: 400/500/700, italic 400. |
| Apparatus rows (eyebrows, fig labels, mono badges) | **IBM Plex Mono** | `.68rem` / `.14em` letter-spacing / `uppercase`. Used for section eyebrows, figure captions, colophon fields, CTA buttons, and all document apparatus. Sourced via the `--font-mono` CSS variable. |
| Mono (data terms) | `ui-monospace, SFMono-Regular, Menlo` | Inline code-style terms in body copy where IBM Plex Mono is not loaded. |

**Retired from homepage (2026-07 refresh):** Cormorant Garamond italic (hero tagline font) and the typewriter-sweep animation (`hero-handwrite` / `hw-text` / `hw-reveal` / `hw-pen`) have been removed. The hero tagline now uses Young Serif italic. Cormorant Garamond is no longer loaded on any page.

All Google Fonts. The pairing is a **serif display + humanist sans body** (Young Serif headings over Hanken Grotesk body). For Tableau, neither web font is on the Tableau server; fall back to a sturdy sans (e.g. system default / Arial) for body and a serif (Georgia) for titles, and reserve the exact look for exported/static pieces where you control fonts.

### Fluid type scale (`clamp(min, preferred, max)`)

Headings/body size themselves fluidly between mobile and desktop. For static materials, use the **max** (desktop) values as fixed sizes:

| Token | Role | min → max |
|-------|------|-----------|
| `--step-3` | h1 / display | 2.20 → **3.20 rem** (~35–51px) |
| `--step-2` | h2 | 1.75 → **2.20 rem** (~28–35px) |
| `--step-1` | h3 / lead-in | 1.40 → **1.70 rem** (~22–27px) |
| `--step-0` | body | 1.10 → **1.30 rem** (~18–21px) |
| `--step--1` | caption / meta | 0.94 → **1.05 rem** (~15–17px) |

Roughly a 1.25 (major-third) modular ratio. Line-heights: headings tight (1.08–1.20), body 1.6.

---

## Texture & detail tokens

- **Faint borders:** current text color at low opacity — `border-faint` = 20%, `border-faint-soft` = 14%. (Auto-adapts to light/dark since it's `currentColor`.)
- **Tinted surfaces:** very light caramel washes, e.g. `color-mix(in srgb, var(--color-caramel) 7–16%, transparent)` for figure frames, card placeholders, callouts.
- **Section heading accent:** a 2.5rem caramel hairline (`#BE7C4D`, 2px) under each `h2`.
- **Corner radius:** `0.5rem` on cards/figures/video embeds.
- **Emphasis style:** italic + jasper for inline emphasis (`.accent`), rather than bold.

---

## Document apparatus

The homepage (and project pages) use a research-document visual language with consistent apparatus conventions. Source: `src/document.css`.

### Figure captions

Format: `Fig. N — Descriptive label` in IBM Plex Mono apparatus style (`.68rem`, `.14em` tracking, uppercase). Positioned below each canvas figure inside `.figure-caption`. The accent color (`--accent`) is used for legend symbols (e.g. triangle `▲`).

### Plate numbering

Work/project cards are "plates": `Plate I`, `Plate II`, `Plate III`, `Plate IV`, `Plate V`. The plate number appears as a `.mono.fig-no` label inside `.plate .body`. Dark plates (Abstract section and Footer) override the token to night-mode values via `--plate-abstract` and `--plate-footer`.

### Section eyebrows

Every section opens with a `.mono.eyebrow-label` tag: format `NN — LABEL` (e.g. `01 — ABSTRACT`, `02 — Plates I–V`). Rendered in `--accent` color.

### Colophon

The footer colophon bar (`.colophon`) has four cells in IBM Plex Mono apparatus style:
- `DOC REF` — document identifier (e.g. `BP-2026`)
- `OBSERVED FROM` — location line
- `CURRENT WORK` — active status line
- `FIELD NOTES` — edition note

### Day/night toggle

The theme toggle button (`.theme-toggle`) renders `◐` (light) or `◑` (dark) followed by `DAY` / `NIGHT` in IBM Plex Mono apparatus style. It writes `bp-theme` to `localStorage` (`'dark'` or `'light'`). On page load, `theme.js` reads this key and applies or removes the `.dark` class on `<html>` before first paint, preventing flash.

---

## Scene deck (homepage, ≥901px viewports)

The homepage (`index.html`) is a six-scene deck on desktop: one persistent canvas figure (`#net`, `assets/js/figure-engine.js`) morphs between named formations behind six full-viewport `.scene` sections inside `#stage`. `assets/js/scenes.js` is the controller — it boots the deck (`html.deck-on`), and below `901px` it does nothing, leaving the original stacked scrolling document as the fallback (verified by `scripts/verify-deck.mjs`'s mobile check).

### Scenes → formations

| # | id | Formation | Plate | Notes |
|---|----|-----------|-------|-------|
| 01 | `home` | `constellation` | light | Fig. 1 hero; hub-and-spoke "what matters" marker |
| 02 | `abstract` | `dispersal` | dark | atmo/grain canvases layered over the faded network |
| 03 | `work` | `margins` | light | table of plates; hover swaps the preview figure |
| 04 | `activity` | `grid` | light | GitHub contribution heatmap |
| 05 | `writing` | `rows` | light | references list |
| 06 | `contact` | `orbit` | dark | mail CTA + colophon; `<footer>` landmark |

`FigureEngine.setFormation(name)` re-targets every node's home position; springs (with a short post-switch "heat" window — `heatUntil`, 900ms, ×2.2 stiffness) carry the morph. Each scene's `data-formation` / `data-plate` attributes drive this from `scenes.js`'s `apply()`.

### Inputs

`go(n)` is the single entry point; every input path funnels through it with a transition lock (`DUR` + `SETTLE`) so nothing can double-advance:

- **Wheel** — accumulates `deltaY` past `THRESHOLD` (90); resets to 0 when clamped at the first/last scene so momentum can't pile up at the boundary. Scene-internal scroll (e.g. long Abstract copy) wins until its own top/bottom edge.
- **Touch** — vertical swipe ≥60px on tablets above the mobile breakpoint.
- **Keyboard** — `ArrowUp/Down`, `PageUp/Down`, `Space`, `Home`, `End`. Ignored while typing in a form field.
- **Hash** — in-page `<a href="#id">` clicks and `hashchange` (e.g. a fresh load at `/#activity` boots straight into that scene — deep links work because `go()` is seeded from `location.hash` on boot).
- **Strip arrows** — `#deck-prev` / `#deck-next` in the caption strip chrome.

Focus only moves to the incoming scene's heading on *user-initiated* navigation — the initial boot `go()` does not steal focus. Inactive scenes are both `aria-hidden` and `inert`, so their links/buttons drop out of tab order.

### Fallbacks

- **<901px**: `scenes.js` returns before doing anything; the page is the plain stacked document (all six sections render in flow, deck strip stays `hidden`).
- **`prefers-reduced-motion: reduce`**: formation morphs cut instantly (no spring heat, no transition duration) instead of animating.
- **No `#net` canvas**: `figure-engine.js` no-ops (the engine itself, not the controller).
- **`#stage` missing / <2 scenes found**: `scenes.js` controller no-ops, same stacked fallback.

### Verifying

`python3 -m http.server 8741` from the repo root, then `node scripts/verify-deck.mjs` (expects Chrome at the hardcoded path in the script). Covers: deck boot, full keyboard walk through all six scenes, hash tracking, formation state, walk-back, dark-theme screenshot, hash deep-link, mobile fallback, reduced motion, wheel advance, and plates hover preview. All 17 checks must print `PASS`.

---

## One-line summary

Warm earthy four-color palette (terracotta **#BE5A38** for emphasis, caramel **#BE7C4D**, deep brown **#3E1F14**, cream **#F2E9E4**), serif display + humanist sans body (Young Serif headings, Hanken Grotesk body, IBM Plex Mono for apparatus rows), research-document visual language (figure captions, plate numbering, section eyebrows, colophon), cream/brown backgrounds instead of white/black, italic-jasper for emphasis over bold.
