# St-Pete Slide Deck — Design

**Date:** 2026-06-29
**Status:** Design approved — ready for implementation planning.
**Scope:** A shareable reveal.js slide deck presenting the St-Pete property-risk
analysis with a narrative arc, for a portfolio / technical-hiring audience. Lives
in `portfolio-site`, reuses already-shipped charts and numbers — no new analysis.

## Purpose

A self-contained, shareable presentation of the St-Pete work that leads with a
clean thesis and then reveals the depth behind it. Audience: **portfolio /
technical hiring** (data-analytics and cat-modeling/actuarial reviewers). It
complements the existing case-study page (`projects/st-pete.html`) with a
presentation-native format — something you can screen-share, link, or export to
PDF and attach.

The deck must read as an **argument**, not a feature tour: a tight flood-repricing
thesis (Act 1), then a "Phase II" reveal that the same question expanded into a
multi-hazard water-risk platform (Act 2), then a close (Act 3). The honesty/rigor
discipline is treated as a first-class differentiator, not a footnote.

## Non-goals

- No new analysis, numbers, or findings — every figure and statistic is reused
  from work already shipped (case study + notebooks 07/09/11 + the cat-model).
- No live demo, no embedded MapLibre app, no backend.
- Not a redesign of the case-study page (this is a sibling artifact; the page stays).
- No new deck framework/build step beyond a CDN include.

## Format & architecture

- **reveal.js via CDN** (same pattern as `st-pete.html`'s Flowbite CDN include) —
  no npm dependency or build-step change. Single self-contained HTML file.
- **Location:** `portfolio-site/deck/st-pete/index.html` (deploys on Vercel at
  `/deck/st-pete/`; linkable from the case study).
- **Theme:** match the portfolio palette (isabelline `#F2E9E4` bg, van-dyke
  `#3E1F14` ink, the existing accent tones) and the Hanken Grotesk / Young Serif
  fonts, so the deck and site feel of a piece. A small inline `<style>` block
  overriding reveal's theme variables is sufficient.
- **Assets:** reuse the four chart PNGs already in `assets/img/charts/`
  (`flood-repricing.png`, `elevation-claims.png`, `zone-x-elevation.png`,
  `pluvial-hidden-homes.png`). One **new** chart is added for the cat-model slide
  (see Assets).
- **Speaker notes** per content slide (reveal's `<aside class="notes">`), so the
  deck doubles as a talk track.
- **PDF export** works via reveal's `?print-pdf` mode (no extra tooling).

## Narrative arc (~15 slides, 3 acts)

**Act 0 — Hook**
1. **Title** — "Pricing the flood risk the maps miss — a St-Pete property-risk analysis" + name/role.
2. **The question** — buying in FL; flood risk is the dominant financial variable; Zillow/Redfin can't filter for what matters (elevation, evac zone, flips, construction). So I built my own analysis.

**Act 1 — The thesis (flood repricing)**
3. **The criteria** — block / slab / Zone X / evac E-or-non / ≥20 ft / not-a-flip. The decision frame.
4. **The data** — ten keyless public sources joined at parcel/zip/sewershed; flood zone spatial-joined; insurance estimated per property.
5. **Finding 1 — the market's flood discount is ~3× too small.** ~$27k one-time discount vs ~$85k/season realized payout per insured home. [chart: `flood-repricing.png`]
6. **Finding 2 — it's an elevation story, two independent methods agree.** Model-free claims↔elevation (ρ ≈ −0.77, survives take-up normalization) and the from-scratch cat-model reproduce the same result. [chart: `elevation-claims.png`]
7. **Finding 3 — FEMA Zone X is real high ground here** (median 29 ft; only 0.1% below the 8 ft surge line). [chart: `zone-x-elevation.png`]
   → *Thesis slide:* elevation is the hedge; flood-zone homes carry repricing downside the current discount doesn't reflect.

**Act 2 — "Phase II: expanding the analysis to other forms of flooding"**
8. **Transition** — "is this house safe from water?" meant more than surge. Phase II widens the lens to rainfall and the sewer system.
9. **The cat-model** — a from-scratch four-module deterministic flood loss model (~$2.6B modeled NFIP loss, an independent validation ladder, reconciles to NFIP take-up). The modeling showpiece. [chart: new cat-model validation figure]
10. **Finding 4 — the 1,130 "hidden" homes.** FEMA Zone X *and* cat-model-dry *yet* low and under-drained (pluvial risk) — the local storm-drain layer Zillow and even First Street structurally can't see. [chart: `pluvial-hidden-homes.png`]
11. **Breadth in one slide** — the water-management program: ingested the city's stormwater + sanitary-sewer networks and built pluvial, compound (surge×rain), and sewer-overflow vulnerability layers (SP0→SP3).
12. **Rigor / honesty — the differentiator.** Relative-vs-validated framing; partial orthogonality stated honestly; caught that outfall elevations were stored in **centimeters**; coverage-tested a national sewer-overflow dataset and found **zero Florida records**; linted the analysis code. "I verify before I trust."

**Act 3 — Close**
13. **The stack** — DuckDB + dbt run locally, FastAPI, Next.js + MapLibre, marimo, geopandas. Engineering credibility, no cloud bill.
14. **Close** — found the house (traded square footage for the criteria); the analysis stands as a reusable property-risk platform. Links: case study · repo · notebooks.

## Assets

- **Reuse (exist):** `flood-repricing.png`, `elevation-claims.png`,
  `zone-x-elevation.png`, `pluvial-hidden-homes.png`.
- **Slide 9 (cat-model): no new chart** — revised at planning. Reproducing the
  rung-C scatter means re-running the full cat-model pipeline in the export script
  (heavy, drift-prone), so slide 9 is instead an **in-slide diagram** of the
  four-module chain (Exposure→Hazard→Vulnerability→Financial) rendered in
  HTML/CSS, plus headline stats ($2.6B modeled, validation ladder, 2.14×→1.58×
  reconciled to NFIP take-up). No asset generation; deck reuses only the four
  existing PNGs.
- All charts are rendered on the isabelline background by the existing `save()`
  helper, so they sit cleanly on deck slides.

## Testing / verification

- Deck HTML parses; reveal.js initializes (no console errors).
- All five chart `<img>` paths resolve; the four reused PNGs exist and the one
  new PNG is generated.
- The deck renders in a browser (eyeball: each act's slides advance, charts
  display, speaker notes present) and `?print-pdf` produces a clean PDF.
- A link to the deck is added to the case study (or at minimum the deck links
  back to the case study) so the two artifacts connect.

## Living documentation

- Note the deck in the portfolio repo's `DESIGN.md` (or equivalent) if it tracks
  per-page/artifact structure, so the deck is discoverable alongside the project pages.

## Acceptance criteria

1. `deck/st-pete/index.html` exists, loads reveal.js via CDN, themed to the
   portfolio palette, and presents the ~15-slide arc above in the three acts,
   with Act 2 titled "Phase II: expanding the analysis to other forms of flooding."
2. The four reused chart PNGs display (Findings 1–4); slide 9 is an in-slide
   diagram (no new chart); every number on a slide traces to already-shipped analysis.
3. Speaker notes are present on the content slides; `?print-pdf` exports cleanly.
4. The deck and the case study link to each other.
5. No new analysis, no backend, no build-step change beyond the CDN include.
