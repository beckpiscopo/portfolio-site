# Scene Deck Homepage — Design

**Date:** 2026-07-09
**Branch:** `homepage-refresh` (checkpoint before this work: commit `08bba9c`, pushed)
**Reference:** Tangible Thinking OS video (`~/Desktop/dev/moodboard/inbox/JORT4uNisJzQqbN_.mp4`) — discrete full-viewport scenes over one persistent, morphing particle field.

## Goal

Convert the homepage from a scrolling document into a fixed-viewport **scene deck**: scrolling no longer moves a page; it advances between six full-viewport scenes staged over one persistent particle canvas. Desktop/laptop only — mobile keeps the current stacked scrolling layout.

## Decisions (settled during brainstorming)

1. **Full scene deck** — all six sections become scenes; the nav page counter becomes the real scene counter (`01 / 06`).
2. **One persistent morphing canvas** — the same node pool re-choreographs per scene; formations, not separate effects.
3. **Mobile (≤900px) keeps normal scroll** — the deck engine never boots; current stacked layout is the mobile mode.
4. **Selected Work = table of plates** — compact index (Plate I–V) with hover/focus-driven large preview; detail stays on case-study pages.
5. **Build in place** on `homepage-refresh`; prior state checkpointed at `08bba9c`.
6. **Engine approach A:** custom discrete-scene engine, vanilla JS, no dependencies (rejected: GSAP scroll-scrub pinning — shows mushy in-between states; native scroll-snap — too little control over transition timing).

## The Six Scenes

Every scene = one full-viewport composition over the particle stage. A fixed nav strip on top; a full-width **caption strip** on the bottom of every scene (current figure's caption left, legend/interaction hint right, prev/next arrows). Caption text comes from `data-` attributes per section.

| # | Scene (existing ID) | Content | Formation | Stage bg |
|---|---------------------|---------|-----------|----------|
| 01 | Field Notes (hero) | Text block bottom-left: eyebrow, H1, subline, CTAs. Full-bleed constellation with load-in choreography (chaos → gather → ignite, "WHAT MATTERS" label). Cluster layout gets a keep-out zone over the text block. | `constellation` | cream |
| 02 | `#abstract` | Lead + detail + origins list (current copy). | `dispersal` — edges fade out, nodes scatter wide as faint dust | dark plate (crossfade) |
| 03 | `#work` | Table of plates: index rows left (Plate no, title, one-liner, stack); hovering/focusing a row swaps a large thumbnail preview right; defaults to St. Pete (featured). | `margins` — particles retreat to edges | cream |
| 04 | `#activity` | GitHub heatmap + caption (existing renderer). | `grid` — faint calendar-like alignment | cream |
| 05 | `#writing` | References list (two entries). | `rows` — subtle ruled lines | cream |
| 06 | `#contact` | Big CTA + channels left; colophon (Doc Ref / Observed From / Current Work / Field Notes) replaces the caption text in the bottom strip — the prev/next arrows persist so the deck remains navigable. | `orbit` — open ellipse ring, slow tangential drift (retires fig8-orbit.js) | dark plate |

Narrative: scatter → structure → judgment (01), dispersal (02), retreat behind the work (03), discipline into observation (04), order into references (05), open orbit inviting you in (06).

## Architecture

### `assets/js/scenes.js` (new, ~350 lines) — deck controller

- Scenes are the existing `<section>` elements (same IDs, same source order, all content in DOM at load), absolutely stacked inside a fixed stage. One is `.active`; inactive scenes `aria-hidden`, `pointer-events: none`.
- Transitions: CSS opacity + slight translate (~650ms), with a state lock (`idle | transitioning`) — input during a transition is ignored; unlock on `transitionend` plus a safety timeout.
- All inputs funnel into `go(n)`:
  - **Wheel:** accumulated `deltaY` threshold; accumulator resets after each transition plus a settle window, so trackpad momentum can't double-advance.
  - **Touch:** vertical swipe (tablets above the mobile breakpoint).
  - **Keyboard:** ↑/↓, PageUp/PageDown, Home/End, space.
  - **Nav links & hashes:** `#work` etc. map to scene indices — header links and inbound deep links from project pages keep working. Hash updates via `replaceState` on scene change; back/forward handled via `hashchange`.
  - **Prev/next arrows** in the caption strip.
- Scene change side effects: counter update, caption-strip text swap, `aria-hidden` bookkeeping, focus moved to the incoming scene's heading, stage background-color transition.
- **Overflow rule:** a scene taller than the viewport scrolls internally; wheel input only advances the deck when the scene is at its scroll boundary.

### `assets/js/figure-engine.js` (evolved from fig1-graph.js) — formations

The existing sim is already a morph engine (nodes chase `hx/hy` homes via springs). Each scene declares a **formation**: a function reassigning homes plus render flags (edges on/off, hub/label on/off, dust emphasis, alpha multipliers):

- `constellation` — hero clusters/edges/hub + "WHAT MATTERS" label; keep-out zone over the text block.
- `dispersal` — wide scatter, no edges, dust-level alpha.
- `margins` — nodes hug the canvas edges.
- `grid` — calendar-like rows/columns.
- `rows` — horizontal ruled lines.
- `orbit` — ellipse ring with slow tangential drift.

`setFormation(name)` retargets homes and injects a brief spring-heat kick so the morph performs itself. Per-formation heat/duration constants are tunable. Load-in choreography plays once (scene 01), then formations take over. Cursor-gather and click-to-add remain active where the formation allows (constellation; disabled for backdrop formations).

### CSS / removals

- `.stage` fixed inset-0; `.scene` absolute stacked; `.active` visible; transition rules; per-scene dark-plate backgrounds.
- reveal.js disabled when the deck boots (scenes own their entrances). fig8-orbit.js retired. Abstract's atmo/grain layers stay as scene-local layers.

## Fallbacks

- **≤900px:** engine never boots; sections render as the current stacked scrolling page (existing mobile CSS is the mobile mode). Canvas remains hero-only there.
- **`prefers-reduced-motion`:** deck still navigates, but cuts are instant — no transition animation, no morph heat, formations applied as static states.
- **No-JS / SEO / a11y:** all content in the DOM in source order at load; document degrades to the stacked layout.

## Risks & mitigations

- **Trackpad momentum double-advance** → transition lock + delta accumulator reset + settle window; tune on real hardware.
- **Short viewports overflow scene content** → internal scene scroll with boundary detection.
- **Mushy morphs** → per-formation heat/duration constants, tuned via frame captures.
- **Content parity** → nothing removed from the DOM; mobile/SEO/screen readers see today's document.

## Verification

Puppeteer (`puppeteer-core` + system Chrome; note: headless `--virtual-time-budget` does **not** drive rAF — use the live capture harness from the session scratchpad):

1. Screenshot every scene, both themes.
2. Capture transition mid-frames to check morphs.
3. Keyboard-only walkthrough of the whole deck.
4. Hash deep-links (`/#work`, `/#contact`) land on the right scenes.
5. ≤900px fallback renders the current stacked layout.
6. Reduced-motion pass (instant cuts).
7. User review on deployed preview before merging to `main`.
