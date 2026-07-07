# Homepage Refresh — "Research Document" Design

**Date:** 2026-07-07
**Scope:** Homepage (`index.html`) redesign. Project pages get light-touch consistency updates only (nav, tokens). Case-study page styling is a follow-up design.
**Reference mockup:** `.superpowers/brainstorm/62792-1783432580/content/homepage-v15.html` — the validated, interactive mockup. Where this spec and the mockup disagree, the mockup wins on visuals; this spec wins on scope and behavior.

## Goal

The current site "does the job but has no creativity or intrigue." Primary audience is **hiring managers/recruiters**: the design must earn a longer look within ~30 seconds, then get out of the way of the case studies.

## Concept

The site is styled as a **research document**: minimalist, mathematics-inspired, graphs as art (Thereby-style). Every visual is an artifact from Beck's own domain — network graphs, figures, plates, references — never generic decoration. The conceit lives in the details (figure captions, plate numbers, colophon), not in shouty chrome.

Section mapping:

| Site section | Document element |
|---|---|
| Hero | Title block + Fig. 1 |
| About | § 01 Abstract (dark atmospheric plate) |
| Projects | § 02 Selected Work — Plates I–V |
| GitHub activity | § 03 Observation Log — Fig. 7 |
| Writing | § 04 References — [1], [2] |
| Contact | § 05 Correspondence — Fig. 8 + colophon (footer) |

## Design tokens

Palette (extends existing DESIGN.md):

- Van Dyke `#3E1F14` — ink (light mode) / background (dark mode)
- Isabelline cream `#F2E9E4` — background (light) / ink (dark)
- Caramel `#BE7C4D` — warm structural tint: h2 underline rule, tints; also the dark-mode accent variant for jasper-family inks
- **Accent ink: Jasper `#BE5A38` (light) / `#BE7C4D` (dark) — retained for now.** Beck flagged it as close to Anthropic's clay and auditioned Drafting Ink `#3A5BA5`/`#93A9E0`, Petrol `#2E6A66`/`#82B8B1`, and Moss `#5F6B38`/`#ABB57E`, but decided to keep Jasper for this release. The `--accent-l/--accent-d` variable system must be implemented regardless so a future swap is a two-line change.
- Deep plate browns (theme-invariant dark surfaces): Abstract plate `#24110A` (deepens to `#1B0C05` in dark mode), footer `#3E1F14` (deepens to `#1C0D06` in dark mode)
- Hairlines: current-ink at low opacity — `.28` standard, `.16` soft (cream-based equivalents on dark surfaces)

Accent system: CSS variables `--accent-l/--accent-d` (+ `-rgb` variants for canvas use); `--accent` resolves per theme. All emphasis (italic `.em`, links, eyebrows, pagination, figure markers, canvas hub/crosshair) routes through `--accent`. Caramel stays fixed regardless of accent choice.

Typography:

- **Young Serif** — display (h1, h2, h3, big CTA, name lockup). Confirmed over Fraunces and Instrument Serif.
- **Hanken Grotesk** — body/UI.
- **IBM Plex Mono** — the document apparatus: meta bars, figure captions, plate numbers, stack lines, buttons, colophon. Small sizes (~0.68rem), uppercase, letterspaced `.14em`.
- Italic emphasis on Young Serif is synthesized oblique (Young Serif ships no italic); mockups validated this look. Cormorant Garamond is retired.
- Typewriter hero effect is retired; the tagline is a single static line.

## Page structure

### Sticky meta-bar nav (page level, not inside hero)

`Beck Piscopo` (Young Serif lockup, the one non-mono element) · `ST. PETERSBURG, FL` centered (mono) · right: `ABOUT / WORK / WRITING / RESUME / CONTACT` (mono) + pagination indicator + theme toggle. Sticky for the whole scroll; hero height is `calc(100vh - bar)` so the first screen fills the viewport exactly.

### Hero — title block + Fig. 1

Two-column grid (1.05fr / 1fr), stacking under 900px:

- Left: headline `I build *research intelligence systems* — instruments for discovering what matters.` (accent italic on the em phrase); subline `Scattered information becomes connected context. Connected context becomes judgment.`; outlined mono CTA `VIEW FIELD NOTES →` (fills Van Dyke on hover).
- Right: **Fig. 1, the interactive network graph** in a hairline-framed panel with caption `Fig. 1 — Structure emerges through relation. Marker tracks densest structure.` and legend `▲ WHAT MATTERS / cursor — gather · click — add observation`.

Fig. 1 behavior (all values validated in mockup):

- 400 nodes seeded as **asymmetric clusters**: 6 cluster centers, power-skewed weights (a few dominate), spreads 22–107px (some tight, some diffuse), 22% uniform scatter. Node radius 1.4–3.0px.
- Physics per frame: spring to slowly-drifting home positions (k=0.0016), damping 0.9; short-range mutual repulsion (14px) via the grid.
- Edges between nodes closer than 88px, alpha ∝ proximity (max .22 light / .18 dark), **per-node edge budget of 9** (keeps knots airy and fast).
- **Cursor = gravity** (190px radius): nodes gather toward the pointer, forming new structure; relax home on leave.
- **Click adds observations**: 6 new permanent nodes bloom in at the click point (cap 480, oldest recycled).
- **Hub tracking**: the highest-degree node gets accent color, accent edges, dashed full-width crosshair rules, and a ▲ marker — "what matters" literally follows the densest structure, including structure the visitor creates.
- Performance: spatial-hash grid (cell = link distance) for edges and repulsion — O(n·k) not O(n²). Measured 60fps at 1440×900. DPR capped at 2.
- Seeding is random per load; every visit gets a different constellation.

### Section scaffold

No header strips. Each section: soft hairline top border, then in-body **accent mono eyebrow** (`02 — Plates I–V`) over a Young Serif h2 with the existing 2.5rem caramel underline rule.

### § 01 Abstract — dark atmospheric plate

Theme-invariant dark section (`#24110A`), styled after the "Market Infrastructure" poster reference:

- **Rib band**: fine vertical hairlines, 9px apart, in a fixed 150px band across the top, fading downward, with a soft hairline base. Brightness varies smoothly along the width (layered sines — some ribs catch more light). Static, no animation.
- **Warm wash**: faint caramel radial gradient (CSS, `~.10` alpha) mid-plate.
- **Heavy film grain**: generated 240px noise tile, alpha ~58/255, `mix-blend-mode: overlay`, opacity .9 (bumped from 46 after Beck asked for more; final value confirmed in mockup v16).
- **Content starts below the band** (`padding-top: 13.5rem`).
- Content: big serif thesis (`…problems that *actually need solutions*…`) left; right column: intro line + the three "built because I needed it to exist" origin stories as an `i. / ii. / iii.` hairline-ruled list with accent links.
- Implementation: scoped CSS variable flip inside `#abstract` (ink→cream, accent→dark variant) so all child styles adapt automatically.

### § 02 Selected Work — Plates I–V

- **Plate I (featured, full-width row)**: St. Pete Property-Risk Analysis — image left / text right.
- Plates II–V in a 2-up grid: Noeron, Tampa Bay Labor-Market, Morphic, Critical Minerals.
- Each plate: hairline frame, thumbnail (real project image, slight sepia filter), mono figure caption (`Plate II · Fig. 3 — Knowledge layer for podcasts`), Young Serif title, description, mono stack line (`DuckDB · dbt · FastAPI · MapLibre`), accent `VIEW CASE STUDY →`. Hover: 3px lift + soft shadow.

### § 03 Observation Log

Existing GitHub contribution pipeline (`scripts/build-contributions.mjs`) rendered as a specimen: hairline frame, dot grid in the warm sequential ramp, caption `Fig. 7 — 1,180 contributions in the last 6 months.` + `View on GitHub ↗`. Theme-aware ramp (light: cream→caramel→jasper→vandyke; dark: deep brown→caramel→cream). Redraws on theme toggle.

### § 04 References

Writing entries as bibliography: `[1]` accent mono numerals, Young Serif titles, italic subtitles, mono year column, hairline rules between.

### § 05 Correspondence — footer final plate

Theme-invariant dark footer (`#3E1F14`, ~88vh min-height):

- Left: eyebrow `05 — Correspondence`; big serif `If you'd like to explore how I can help *your team*, let's connect.` (caramel italic); mono CTA `START A CONVERSATION →` (mailto); channel links GitHub / X / Substack.
- Right: **Fig. 8 — orbital sphere**: dotted meridians of a slowly precessing wireframe sphere (15 meridians, warm caramel-family tones — deliberately *not* accent-dependent, since the plate is theme-invariant; front/back alpha depth), dotted equator, and a **cream ◆ traveling an outer orbit** — caption `Fig. 8 — Open orbit. New bodies welcome.` legend `◆ You, perhaps`. Gentle tilt toward cursor.
- Bottom: colophon strip — `DOC REF / BP-2026` · `CURRENT WORK / Noeron · Morphic · Decision Intelligence` · `FIELD NOTES / E-0001`.

## Theming — day / night

- Toggle in the nav (`◐ Night` / `◑ Day`), persisted in `localStorage`, applied via `data-theme="dark"` on `<html>`.
- Mechanism: variable flip (ink↔bg swap, accent switches to its dark variant, hairlines go cream-based). Smooth `.35s` background/color transitions.
- All three canvases are theme-aware and re-render on toggle (Fig. 1 reads theme per frame; Fig. 7 redraws; Fig. 8 tones work on both since its plate is invariant).
- Dark mode hero: cream luminous nodes on deep brown — the "night observation" reading.
- Should respect `prefers-color-scheme` for the initial default, with the stored choice winning.

## Motion & accessibility

- **Scroll reveals**: sections and plates fade-rise (16px, .7s) once via IntersectionObserver.
- **Pagination**: nav indicator `01 / 05` tracks the section in view.
- `prefers-reduced-motion`: reveals disabled; Fig. 1 and Fig. 8 render a static frame; no animation loops.
- Canvases are `aria-hidden`; all text is real HTML; headline (not canvas) is the LCP; no layout shift.
- Animation loops for below-the-fold canvases are gated by IntersectionObserver (only run on screen).

## Implementation notes

- Keep the static-HTML + Tailwind/PostCSS pipeline. The mockup is vanilla CSS — port into `src/theme.css` custom properties + component classes; Tailwind utilities where convenient.
- JS: small vanilla modules (no framework): `fig1-graph.js`, `fig8-orbit.js`, `abstract-plate.js` (ribs + grain), `theme.js`, `reveal.js`. No external libraries.
- Google Fonts: add IBM Plex Mono; drop Cormorant Garamond and the typewriter script.
- Update `DESIGN.md` after implementation (accent ink, IBM Plex Mono, dark plate browns, figure-caption conventions).
- Project pages (light touch only): swap to the new sticky meta-bar nav, IBM Plex Mono for meta labels, accent ink replaces jasper. Full case-study restyling is a separate follow-up design.

## Open decisions

1. **Accent ink** — Drafting Ink vs Petrol vs Moss (jasper rejected as too Anthropic). Owner: Beck.
2. Grain intensity — current is "maybe a little too subtle"; nudge up during implementation and eyeball.
3. Tagline wording — mockup copy (`research intelligence systems…`) came from Beck's reference mockup; confirm final.
4. `VIEW FIELD NOTES →` target — Plates section (current mockup) vs. a future field-notes page.

## Out of scope

- Case-study page redesign (next design effort).
- Seeding Fig. 1 from real project data with hoverable entity labels (noted as a compelling future enhancement).
- Resume page changes.
