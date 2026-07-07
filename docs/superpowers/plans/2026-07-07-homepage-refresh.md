# Homepage Refresh ("Research Document") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `index.html` as the validated "research document" design (interactive Fig. 1 network hero, atmospheric Abstract plate, Plates, Observation Log, References, orbital-footer), with day/night theming, and apply light-touch nav/token updates to the four project pages.

**Architecture:** Static HTML + Tailwind/PostCSS (existing pipeline, no new dependencies). New design tokens extend `src/theme.css`; all new component styles live in a new `src/document.css` imported by `src/input.css`. Interactive figures are small vanilla-JS IIFE modules in `assets/js/`, each reading theme state from the existing `.dark` class on `<html>` and accent color from CSS variables. The GitHub heatmap keeps its existing DOM renderer and JSON pipeline — only its frame and caption change.

**Tech Stack:** HTML, CSS custom properties, Tailwind 3 (`npm run build-css`), vanilla ES2020 JS, Canvas 2D. No frameworks, no new npm packages.

**Reference artifacts (source of truth for all visual values):**
- Spec: `docs/superpowers/specs/2026-07-07-homepage-refresh-design.md`
- Validated mockup: `docs/superpowers/specs/assets/2026-07-07-homepage-mockup.html` (committed in Task 1 from `.superpowers/brainstorm/62792-1783432580/content/homepage-v16-final.html`)

## Global Constraints

- Palette: Van Dyke `#3E1F14`, Caramel `#BE7C4D`, Jasper `#BE5A38`, Isabelline `#F2E9E4`. Accent = Jasper, but ALL emphasis must route through `--accent` variables (`--accent-l: #BE5A38`, `--accent-rgb-l: 190,90,56`, `--accent-d: #BE7C4D`, `--accent-rgb-d: 190,124,77`) so a future swap is two lines.
- Theme-invariant plate browns: Abstract `#24110A` (dark mode `#1B0C05`), footer `#3E1F14` (dark mode `#1C0D06`).
- Fonts: Young Serif (display), Hanken Grotesk (body), IBM Plex Mono 400/500 (apparatus). Cormorant Garamond and the typewriter effect are removed from the homepage.
- Dark mode hook is the existing `.dark` class on `<html>` (NOT `data-theme`). Initial state: `localStorage['bp-theme']` if set, else `prefers-color-scheme`. The old hour-of-day auto-dark is removed.
- Mono apparatus style everywhere it appears: IBM Plex Mono, `font-size: .68rem`, `letter-spacing: .14em`, uppercase.
- All canvases: `aria-hidden="true"`, devicePixelRatio capped at 2, animation loops gated by IntersectionObserver where below the fold, `prefers-reduced-motion` gets a single static frame.
- Fig. 1 engine constants (validated): 400 nodes (cap 480), link distance 88px, per-node edge budget 9, gather radius 190px, repulsion 14px, spring 0.0016, damping 0.9, node radius 1.4–3.0px, 6 clusters (power-skewed weights, spread 22–107px), 22% uniform scatter, spatial-hash grid for all neighbor queries. Must hold ~60fps at 1440×900.
- Abstract plate: rib hairlines every 9px in a 150px top band; grain tile alpha 58/255 at overlay opacity .9; content starts below the band (`padding-top: 13.5rem`).
- Build command: `npm run build-css` (PostCSS → `dist/output.css`). Bump the `?v=` cache-buster on `dist/output.css` and `assets/js/*.js` references whenever they change (use `?v=20260707a`).
- Verification server: `python3 -m http.server 8899` from repo root; pages at `http://localhost:8899/index.html`.
- Commit after every task (messages given per task, end with the Claude Code trailer).

## File Structure

- `src/theme.css` — modify: add accent/hairline/plate tokens + `.dark` overrides.
- `src/document.css` — create: all "research document" component styles (meta-bar, sheet, figure frames, plates, refs, footer, switch-free; ~everything from the mockup `<style>` block, adapted to `.dark`).
- `src/input.css` — modify: `@import './document.css';`, update font `@import`.
- `index.html` — rewrite body to the new structure; keep analytics, contributions loader, and heatmap markup.
- `assets/js/theme.js` — create: theme init (localStorage/prefers-color-scheme) + toggle binding. Replaces the hour-based logic in `site.js`.
- `assets/js/fig1-graph.js` — create: hero network graph engine.
- `assets/js/abstract-plate.js` — create: rib band + grain for the Abstract.
- `assets/js/fig8-orbit.js` — create: footer orbital sphere.
- `assets/js/reveal.js` — create: scroll reveals + nav pagination.
- `assets/js/site.js` — modify: remove hour-based dark init (now in theme.js); everything else stays (project pages still use it).
- `projects/*.html` (4 files) — modify: light touch (fonts link + meta-bar nav replacing sidebar).
- `DESIGN.md` — modify: document new tokens/conventions.

Tasks 3–6 are independent of each other once Task 2 lands; do them in order anyway for simple review.

---

### Task 1: Commit the mockup reference + design tokens

**Files:**
- Create: `docs/superpowers/specs/assets/2026-07-07-homepage-mockup.html` (copy)
- Modify: `src/theme.css` (append tokens), `src/input.css` (font import), `.gitignore` (add `.superpowers/`)

**Interfaces:**
- Produces: CSS variables `--accent`, `--accent-rgb`, `--accent-l/-d`, `--accent-rgb-l/-d`, `--hairline`, `--hairline-soft`, `--font-mono`, `--plate-abstract`, `--plate-footer` — consumed by every later task. `.dark` flips `--accent`/`--accent-rgb`/hairlines.

- [ ] **Step 1: Copy the mockup into the repo and gitignore the scratch dir**

```bash
mkdir -p docs/superpowers/specs/assets
cp .superpowers/brainstorm/62792-1783432580/content/homepage-v16-final.html docs/superpowers/specs/assets/2026-07-07-homepage-mockup.html
grep -qxF '.superpowers/' .gitignore || echo '.superpowers/' >> .gitignore
```

- [ ] **Step 2: Append tokens to `src/theme.css`** (after the existing `.dark { ... }` block):

```css
/* ---- Research-document tokens (2026-07 homepage refresh) ---- */
:root {
  /* Accent ink: jasper today; swap = change these four lines */
  --accent-l: #BE5A38;  --accent-rgb-l: 190, 90, 56;
  --accent-d: #BE7C4D;  --accent-rgb-d: 190, 124, 77;
  --accent: var(--accent-l);
  --accent-rgb: var(--accent-rgb-l);

  --hairline: rgba(62, 31, 20, .28);
  --hairline-soft: rgba(62, 31, 20, .16);

  --plate-abstract: #24110A;   /* theme-invariant dark plates */
  --plate-footer: #3E1F14;

  --font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}
.dark {
  --accent: var(--accent-d);
  --accent-rgb: var(--accent-rgb-d);
  --hairline: rgba(242, 233, 228, .3);
  --hairline-soft: rgba(242, 233, 228, .16);
  --plate-abstract: #1B0C05;
  --plate-footer: #1C0D06;
}
/* Route the legacy jasper var through the accent so old styles follow the swap */
:root { --color-jasper: var(--accent); }
```

Note: `--color-jasper` is re-declared after its original definition; last declaration wins, and the original hex now lives in `--accent-l`.

- [ ] **Step 3: Update the font import in `src/input.css`** — replace the existing `@import url(...)` line with:

```css
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,300..700;1,400&family=IBM+Plex+Mono:wght@400;500&family=Young+Serif&display=swap');
```

- [ ] **Step 4: Build and verify**

Run: `npm run build-css && grep -c 'accent-rgb-l' dist/output.css`
Expected: build succeeds; grep prints `1` or more.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/assets .gitignore src/theme.css src/input.css dist/output.css
git commit -m "feat(tokens): accent-ink variable system, hairlines, plate browns, plex mono"
```

---

### Task 2: Homepage structure — new `index.html` + `src/document.css` (static, no canvases yet)

**Files:**
- Modify: `index.html` (full body rewrite; keep `<head>` analytics/CSS wiring), `src/input.css` (one import line)
- Create: `src/document.css`

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: DOM ids consumed by later tasks: `#net` (Fig. 1 canvas), `#atmo` + `#grain` (Abstract), `#orbit` (Fig. 8), `#theme-toggle-btn`, `#pageno`, `#heatmap` + `#heatmap-caption` (existing ids, kept), sections `#abstract #work #activity #writing #contact` each with `data-sec="01".."05"` and class `reveal`; plates have class `plate reveal`.

Port the structure and styles from the mockup (`docs/superpowers/specs/assets/2026-07-07-homepage-mockup.html`) with these adaptations — otherwise copy the mockup's markup/CSS verbatim:

1. `html[data-theme="dark"]` selectors become `.dark` descendant selectors.
2. The mockup's `<style>` block goes into `src/document.css` (minus the `.switcher` styles — the accent/font switchers were brainstorm tooling; do not port them).
3. Real links: nav Resume → `assets/pdf/v2_light_resume_2025.pdf`; plate links → `projects/st-pete.html`, `projects/noeron.html`, `projects/tampa-labor.html`, `projects/morphic.html` (Critical Minerals has no link); writing/contact/channel URLs from the current `index.html` (Substack posts, GitHub, X, Substack); CTA `mailto:beckpiscopo@gmail.com`.
4. Thumbnails: relative `assets/img/projects/*.png` paths with the existing `alt` text and `loading="lazy"`.
5. The Activity section keeps the existing `#heatmap-caption` + `.heatmap-wrap > #heatmap` markup, wrapped in the new `obs-frame` figure with the mono caption row (`Fig. 7 — …` text is set by the existing loader; see Task 6).
6. Theme toggle: replace the mockup's `◐ Night` button markup with `<button class="theme-toggle" id="theme-toggle-btn" aria-label="Toggle night mode">◐ Night</button>` (behavior in Task 7). Remove the old floating `#dark-toggle` SVG button and the sidebar/mobile-drawer markup from the homepage entirely.
7. `<head>`: drop the Flowbite CSS `<link>` and Cormorant from the fonts link (final fonts link = the Task 1 families); keep `dist/output.css?v=20260707a`. At the end of `<body>`: remove the typewriter/scroll-morph inline script and the Flowbite JS `<script>`; keep the contributions loader script and Vercel analytics; keep `assets/js/site.js?v=20260707a`.
8. Responsive: the mockup's `@media (max-width: 900px)` rules; additionally in `document.css`:

```css
@media (max-width: 720px) {
  .meta-top { flex-wrap: wrap; gap: .5rem .9rem; padding: .9rem 1.25rem; }
  .meta-top > .mono:nth-child(2) { display: none; }  /* hide St. Petersburg on small */
  .headline-cell { padding: 3rem 1.5rem 2.5rem; }
  .sec-body { padding-left: 1.25rem; padding-right: 1.25rem; }
}
```

- [ ] **Step 1: Create `src/document.css`** with the adapted mockup styles (sheet/meta-top/hero/figure/sections/abstract plate/plates/obs-frame/refs/footer/colophon/reveal/pageno/theme-toggle + responsive rules above). Add `@import './document.css';` in `src/input.css` directly after `@import './theme.css';`.

- [ ] **Step 2: Rewrite `index.html`** per the adaptation list. Keep the contributions loader `<script>` exactly as-is for now (Task 6 adjusts one line of caption copy).

- [ ] **Step 3: Build + serve + eyeball**

```bash
npm run build-css
python3 -m http.server 8899 &
```

Open `http://localhost:8899/index.html`. Expected: full page renders in the new layout (Fig. 1 / atmosphere / orbit panels are empty for now); heatmap loads; no console errors except none; nav links jump to sections.

- [ ] **Step 4: Layout regression vs mockup** — screenshot both at 1440×900 and 390×844 and compare section order, nav, plates grid. Fix discrepancies.

- [ ] **Step 5: Commit**

```bash
git add index.html src/document.css src/input.css dist/output.css
git commit -m "feat(home): research-document page structure and styles (static)"
```

---

### Task 3: Fig. 1 — interactive network graph (`assets/js/fig1-graph.js`)

**Files:**
- Create: `assets/js/fig1-graph.js`
- Modify: `index.html` (add `<script src="assets/js/fig1-graph.js?v=20260707a" defer></script>`)

**Interfaces:**
- Consumes: `#net` canvas inside `.figure-canvas-wrap`; `.dark` class; `--accent` / `--accent-rgb` vars.
- Produces: nothing consumed later (self-contained).

- [ ] **Step 1: Write `assets/js/fig1-graph.js`** — port the mockup's Fig. 1 block verbatim with two adaptations: wrap in an IIFE that bails if `#net` is absent, and theme helpers read the class/vars:

```js
// Fig. 1 — interactive network graph. 400 clustered nodes, spatial-hash
// neighbor queries, cursor-gravity gathering, click-to-add observations,
// accent marker tracking the densest node. Values validated in
// docs/superpowers/specs/assets/2026-07-07-homepage-mockup.html.
(function () {
  const canvas = document.getElementById('net');
  if (!canvas) return;
  const rootEl = document.documentElement;
  const isDark = () => rootEl.classList.contains('dark');
  const accRGB = () => getComputedStyle(rootEl).getPropertyValue('--accent-rgb').trim();
  const accHex = () => getComputedStyle(rootEl).getPropertyValue('--accent').trim();
  // ... [entire engine copied from the mockup: constants BASE_N=400, MAX_N=480,
  //      LINK=88, GATHER_R=190, PAD=14, REPEL=14, EDGE_BUDGET=9; gauss(),
  //      cluster seeding, buildGrid()/neighbors(), physics, edges, hub,
  //      crosshair, marker, reduced-motion single frame]
})();
```

Copy the engine body from the mockup file between `/* ---------- Fig. 1` and `/* ---------- Fig. 7` comments, replacing its `isDark/accRGB/accHex` definitions with the three lines above. No other logic changes.

- [ ] **Step 2: Verify in browser** — reload `http://localhost:8899/index.html`. Expected: dense clustered constellation drifting in the hero panel; cursor gathers nodes; click adds 6 nodes that bloom in; ▲ marker + dashed crosshair track the densest knot; toggling `document.documentElement.classList.toggle('dark')` in the console recolors nodes/edges live.

- [ ] **Step 3: FPS check** — in the browser console:

```js
let f=0,t0=performance.now();(function tick(){f++;performance.now()-t0<2000?requestAnimationFrame(tick):console.log('fps',f/2)})();
```

Expected: ≥ 55.

- [ ] **Step 4: Reduced-motion check** — in DevTools, emulate `prefers-reduced-motion: reduce`, reload. Expected: static constellation, no animation.

- [ ] **Step 5: Commit**

```bash
git add assets/js/fig1-graph.js index.html
git commit -m "feat(home): Fig. 1 interactive network graph"
```

---

### Task 4: Abstract plate — ribs + grain (`assets/js/abstract-plate.js`)

**Files:**
- Create: `assets/js/abstract-plate.js`
- Modify: `index.html` (script tag, defer)

**Interfaces:**
- Consumes: `#atmo` canvas + `#grain` div inside `#abstract`.

- [ ] **Step 1: Write the module** — copy the mockup's "abstract atmosphere" IIFE verbatim (static rib band: 9px spacing, 150px height, layered-sine `lumAt`, hairline base; grain tile 240px, alpha **58**, applied as background-image data URL) adding only the guard `if (!document.getElementById('atmo')) return;` at the top. It draws once and on `resize` — no animation loop.

- [ ] **Step 2: Verify** — reload; the Abstract shows the rib band across the top with varied brightness, heavy grain over the whole plate, warm radial wash (CSS from Task 2), and content starting below the band. Same appearance in both themes (plate is invariant; bg deepens via `--plate-abstract`).

- [ ] **Step 3: Commit**

```bash
git add assets/js/abstract-plate.js index.html
git commit -m "feat(home): abstract plate rib band and film grain"
```

---

### Task 5: Fig. 8 — footer orbital sphere (`assets/js/fig8-orbit.js`)

**Files:**
- Create: `assets/js/fig8-orbit.js`
- Modify: `index.html` (script tag, defer)

**Interfaces:**
- Consumes: `#orbit` canvas inside `.footer-fig .orbit-wrap`.

- [ ] **Step 1: Write the module** — copy the mockup's Fig. 8 IIFE verbatim (15 dotted meridians precessing at `t*0.00006`, front/back alpha 0.55/0.22, warm caramel-family literals — NOT accent vars; dotted equator; cream ◆ on the outer `R*1.28 / R*0.35` orbit at `0.00035`; pointer tilt ±0.35) with two additions: the `#orbit` guard, and IntersectionObserver gating so the loop only runs while the footer is on screen (copy the `running` + observer pattern from the mockup's v11 atmosphere if unfamiliar — set `running=false` off-screen and re-`requestAnimationFrame` on entry). Reduced motion: draw one frame.

- [ ] **Step 2: Verify** — scroll to footer: sphere precesses slowly, ◆ orbits, dims behind the sphere; caption `Fig. 8 — Open orbit. New bodies welcome.` + `◆ You, perhaps`. Scroll away, check (DevTools performance) no rAF churn while off-screen.

- [ ] **Step 3: Commit**

```bash
git add assets/js/fig8-orbit.js index.html
git commit -m "feat(home): Fig. 8 orbital sphere footer"
```

---

### Task 6: Observation Log framing (existing heatmap, new caption)

**Files:**
- Modify: `index.html` (contributions loader script: caption line), `src/document.css` (obs-frame styles if not already complete from Task 2)

**Interfaces:**
- Consumes: existing `#heatmap` renderer + `assets/data/contributions.json`; existing `.lvl-0..4` theme-aware colors in `src/input.css` (keep — they already implement the spec's ramp).

- [ ] **Step 1: Update the caption line** in the inline contributions script from

```js
caption.textContent = `${visibleTotal.toLocaleString()} contributions in the last 6 months`;
```

to

```js
caption.textContent = `Fig. 7 — ${visibleTotal.toLocaleString()} contributions in the last 6 months.`;
```

- [ ] **Step 2: Verify** — the heatmap sits in a hairline `obs-frame`, mono caption reads `FIG. 7 — 1,180 CONTRIBUTIONS…` (styled uppercase by the mono class), `View on GitHub ↗` in the caption row; dots recolor when toggling `.dark` (no reload needed — CSS classes).

- [ ] **Step 3: Commit**

```bash
git add index.html src/document.css
git commit -m "feat(home): observation-log framing for contribution figure"
```

---

### Task 7: Theming (`assets/js/theme.js`) + reveals/pagination (`assets/js/reveal.js`)

**Files:**
- Create: `assets/js/theme.js`, `assets/js/reveal.js`
- Modify: `index.html` (script tags — `theme.js` loads in `<head>` WITHOUT defer to avoid theme flash; `reveal.js` deferred), `assets/js/site.js` (remove hour-based dark init), project pages untouched here.

**Interfaces:**
- Consumes: `#theme-toggle-btn`, `#pageno`, `[data-sec]` sections, `.reveal` elements, `#dark-toggle` (project pages, later).
- Produces: `.dark` on `<html>`; `localStorage['bp-theme']` = `'dark' | 'light'`.

- [ ] **Step 1: Write `assets/js/theme.js`:**

```js
// Theme: stored choice wins, else OS preference. Binds any toggle present
// (#theme-toggle-btn on the homepage meta-bar, #dark-toggle on legacy pages).
(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('bp-theme');
  const dark = stored ? stored === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  root.classList.toggle('dark', dark);

  function bind(btn) {
    if (!btn) return;
    const label = () => { if (btn.id === 'theme-toggle-btn') btn.textContent = root.classList.contains('dark') ? '◑ Day' : '◐ Night'; };
    btn.addEventListener('click', () => {
      const nowDark = root.classList.toggle('dark');
      localStorage.setItem('bp-theme', nowDark ? 'dark' : 'light');
      label();
    });
    label();
  }
  document.addEventListener('DOMContentLoaded', () => {
    bind(document.getElementById('theme-toggle-btn'));
    bind(document.getElementById('dark-toggle'));
  });
})();
```

- [ ] **Step 2: Remove from `assets/js/site.js`** the three hour-based lines and its `#dark-toggle` binding (lines beginning `const hour = new Date().getHours();` through the `darkToggle.addEventListener` statement) — theme.js owns both now. Add `<script src="assets/js/theme.js?v=20260707a"></script>` to the `<head>` of `index.html`.

- [ ] **Step 3: Write `assets/js/reveal.js`** — copy the mockup's "scroll reveal + pagination" IIFE verbatim (reveal observer threshold .12, one-shot; pageno observer rootMargin `-40% 0px -55% 0px` writing `NN / 05`), adding guards for missing `#pageno`. The `.reveal` CSS (opacity/translate/transition + reduced-motion off) came over in Task 2.

- [ ] **Step 4: Verify** — hard-reload with OS dark mode on and no localStorage: page opens dark. Toggle → flips + persists across reload. Sections fade-rise once on scroll; `01 / 05` tracks sections. Reduced-motion: content visible immediately, no transforms.

- [ ] **Step 5: Commit**

```bash
git add assets/js/theme.js assets/js/reveal.js assets/js/site.js index.html
git commit -m "feat(theme): stored/OS-preference theming, scroll reveals, nav pagination"
```

---

### Task 8: Project pages light touch (4 files)

**Files:**
- Modify: `projects/noeron.html`, `projects/morphic.html`, `projects/st-pete.html`, `projects/tampa-labor.html`

**Interfaces:**
- Consumes: `.meta-top` styles (document.css), `theme.js`.

For each project page:

- [ ] **Step 1:** Update the fonts `<link>` to the Task 1 family list (add IBM Plex Mono; Cormorant may remain if the page uses it — check with grep, remove if unused). Bump `dist/output.css` cache-buster to `?v=20260707a`.
- [ ] **Step 2:** Replace the fixed sidebar `<aside id="sidebar">` + mobile bar with the homepage's sticky `.meta-top` bar (lockup links to `../index.html`; nav links → `../index.html#abstract`, `../index.html#work`, `../index.html#writing`, resume PDF, `../index.html#contact`; keep the `#dark-toggle` button OR swap to `#theme-toggle-btn` mono button — use the mono button for consistency). Remove the `md:ml-64` wrapper class so content centers full-width. Add `<script src="../assets/js/theme.js?v=20260707a"></script>` in `<head>`.
- [ ] **Step 3:** Verify each page: nav sticks, theme toggles + persists, no sidebar remnants, case-study content unchanged, no console errors.
- [ ] **Step 4: Commit**

```bash
git add projects/*.html
git commit -m "feat(projects): meta-bar nav and shared theming (light touch)"
```

---

### Task 9: Cleanup, DESIGN.md, final verification

**Files:**
- Modify: `DESIGN.md`, `src/input.css` (remove dead styles), `index.html` if straggling refs remain

- [ ] **Step 1: Dead-code sweep** — `grep -rn "Cormorant\|hero-handwrite\|hw-text\|flowbite" index.html src/ | grep -v node_modules`. Remove hits in homepage scope: typewriter styles in `src/input.css`, Flowbite references in `index.html`. (Flowbite may remain in `tailwind.config.js` and project pages — out of scope, leave.)
- [ ] **Step 2: Update `DESIGN.md`** — add under Typography: IBM Plex Mono apparatus row (.68rem/.14em/uppercase); under Color palette: accent-variable system note ("emphasis routes through `--accent`; jasper is the current ink"), plate browns; new section "Document apparatus" listing figure-caption, plate-numbering, eyebrow (`NN — label`), and colophon conventions. Note Cormorant/typewriter retirement.
- [ ] **Step 3: Full verification pass** — `npm run build-css`; serve; check at 1440×900 and 390×844 in BOTH themes: hero graph 60fps, abstract plate, plates hover, heatmap, references, footer orbit, pagination, reveals, toggle persistence; reduced-motion pass; `console.log` clean on all 5 pages.
- [ ] **Step 4: Screenshot archive** — save light/dark full-page screenshots to `docs/superpowers/specs/assets/` for the record.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(site): research-document homepage refresh — cleanup and docs"
```

---

## Self-Review Notes

- Spec coverage: concept/sections (T2), Fig. 1 (T3), Abstract plate (T4), Fig. 8 (T5), Observation Log (T6), theming + motion + pagination (T7), project pages (T8), DESIGN.md + a11y/perf verification (T9), accent system + tokens (T1). Spec's "canvas Fig. 7" is intentionally satisfied by the existing theme-aware DOM heatmap (visually identical, less code) — deviation noted in T6.
- Open spec items resolved here: tagline copy = mockup copy (T2 ports it verbatim); `VIEW FIELD NOTES →` targets `#work`.
- No test framework exists in this repo; verification is build + browser checks with exact expectations per task.
