# St-Pete Slide Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shareable reveal.js slide deck of the St-Pete property-risk analysis (portfolio/technical-hiring audience) as a single self-contained HTML file, reusing the existing chart PNGs.

**Architecture:** One file, `portfolio-site/deck/st-pete/index.html`, loading reveal.js 5.x via CDN (same pattern as the site's Flowbite include), themed to the portfolio palette. Four content slides reuse PNGs in `assets/img/charts/`; the cat-model slide is an in-slide HTML/CSS diagram (no new asset). The deck and the case study cross-link.

**Tech Stack:** reveal.js 5.1.0 (CDN), HTML/CSS, Google Fonts (Hanken Grotesk + Young Serif). No build-step change.

## Global Constraints

- **Single repo:** `portfolio-site`. No work in `st_pete_analytics` — **no new charts** (reuse the four existing PNGs).
- **No new analysis or numbers.** Every figure/stat on a slide traces to already-shipped work. Exact values to use: flood discount **~$27k** vs **~$85k/season** payout (~3×); elevation↔claims **ρ ≈ −0.77** (survives take-up normalization); Zone-X median **29 ft**, 0.1% below 8 ft; cat-model **~$2.6B** modeled, rung-C **2.14× → 1.58×** reconciled to take-up; pluvial hidden set **1,130** homes (Zone X ∩ cat-model-dry ∩ top-quartile pluvial).
- **File location:** `deck/st-pete/index.html`. Chart paths from there are `../../assets/img/charts/<name>.png` (the four files: `flood-repricing.png`, `elevation-claims.png`, `zone-x-elevation.png`, `pluvial-hidden-homes.png` — all already exist).
- **Theme:** isabelline bg `#F2E9E4`, van-dyke ink `#3E1F14`, jasper accent `#BE5A38`, caramel `#BE7C4D`; headings Young Serif, body Hanken Grotesk.
- **reveal.js 5.1.0 via jsDelivr**, with the **notes** plugin; speaker notes (`<aside class="notes">`) on content slides; `?print-pdf` must work.
- **Act 2 is titled "Phase II: expanding the analysis to other forms of flooding."**
- Conventional commits. Plan lives in portfolio-site.

## File structure

- `deck/st-pete/index.html` — the entire deck (created Task 1; slides appended Tasks 2–4 at HTML comment anchors `<!-- ACT 1 -->`, `<!-- ACT 2 -->`, `<!-- ACT 3 -->`).
- `projects/st-pete.html` — modified once (Task 4) to add a "Slides ↗" link.

---

### Task 1: Deck scaffold, theme, and Act 0

**Files:**
- Create: `portfolio-site/deck/st-pete/index.html`

**Interfaces:**
- Produces: a working reveal.js deck with the theme and the two Act-0 slides, plus three anchors (`<!-- ACT 1 -->`, `<!-- ACT 2 -->`, `<!-- ACT 3 -->`) for later tasks.

- [ ] **Step 1: Create `deck/st-pete/index.html`** with this exact content:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>St-Pete Property-Risk Analysis · Beck Piscopo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,400;0,500;0,700;1,400&family=Young+Serif&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reset.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
  <style>
    :root {
      --bg: #F2E9E4; --ink: #3E1F14; --jasper: #BE5A38; --caramel: #BE7C4D;
    }
    .reveal { font-family: "Hanken Grotesk", system-ui, sans-serif; color: var(--ink); font-size: 30px; }
    .reveal-viewport { background: var(--bg); }
    .reveal h1, .reveal h2, .reveal h3 { font-family: "Young Serif", Georgia, serif; color: var(--ink); text-transform: none; font-weight: 400; letter-spacing: -0.01em; }
    .reveal h1 { font-size: 2.0em; line-height: 1.05; }
    .reveal h2 { font-size: 1.5em; }
    .reveal h3 { font-size: 1.15em; }
    .reveal a { color: var(--jasper); text-underline-offset: 2px; }
    .reveal strong { color: var(--jasper); }
    .reveal em.accent { color: var(--jasper); font-style: normal; }
    .reveal section img { background: var(--bg); border: 0; box-shadow: none; max-height: 60vh; }
    .reveal .lead { font-style: italic; opacity: .85; }
    .reveal .meta { font-size: .6em; opacity: .55; text-transform: uppercase; letter-spacing: .08em; }
    .reveal ul, .reveal ol { width: 100%; }
    /* cat-model pipeline diagram (slide 9) */
    .pipeline { display: flex; gap: .5em; align-items: stretch; justify-content: center; margin: .4em 0; }
    .pipeline .mod { border: 2px solid var(--ink); border-radius: 8px; padding: .5em .7em; flex: 1; }
    .pipeline .mod b { display: block; font-family: "Young Serif", serif; }
    .pipeline .mod span { font-size: .62em; opacity: .7; }
    .pipeline .arrow { align-self: center; color: var(--jasper); font-size: 1.4em; }
    .stat { color: var(--jasper); font-weight: 700; }
  </style>
</head>
<body>
  <div class="reveal"><div class="slides">

    <!-- ===================== ACT 0 — HOOK ===================== -->
    <section data-auto-animate>
      <p class="meta">Beck Piscopo · property-risk analytics</p>
      <h1>Pricing the flood risk<br>the maps miss</h1>
      <p class="lead">A St-Petersburg, FL property-risk analysis — built because the consumer tools couldn't answer the question.</p>
      <aside class="notes">One-line hook: the market and the flood maps misprice flood risk; I built the analysis to see it, then it grew into a multi-hazard platform.</aside>
    </section>

    <section>
      <h2>The question</h2>
      <p>Buying a house in Florida, <strong>flood risk is the dominant financial variable</strong> — insurance swings dwarf price differences. But Zillow, Redfin, and Realtor can't filter for what actually matters:</p>
      <ul>
        <li>ground elevation &amp; evacuation zone</li>
        <li>whether it's a cosmetic flip</li>
        <li>construction type &amp; true all-in monthly cost</li>
      </ul>
      <p class="lead">So I built my own analysis of the St-Pete market.</p>
      <aside class="notes">Frame the gap in consumer tools. Insurance is the transmission mechanism for flood risk. The maps are also stale and about to be redrawn.</aside>
    </section>

    <!-- ACT 1 -->

    <!-- ACT 2 -->

    <!-- ACT 3 -->

  </div></div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/notes/notes.js"></script>
  <script>
    Reveal.initialize({ hash: true, slideNumber: "c/t", plugins: [ RevealNotes ] });
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify it loads and is themed**

```bash
cd /Users/beckpiscopo/Desktop/dev/portfolio-site
python3 -c "import html.parser; html.parser.HTMLParser().feed(open('deck/st-pete/index.html').read()); print('parses')"
grep -c "ACT 1\|ACT 2\|ACT 3" deck/st-pete/index.html   # expect 3 anchors
```
Then open `deck/st-pete/index.html` in a browser: the title slide shows in Young Serif on the isabelline background, arrow keys advance to "The question," and `?print-pdf` mode loads. Expected: `parses`, anchor count 3, no console errors.

- [ ] **Step 3: Commit**

```bash
git add deck/st-pete/index.html
git commit -m "feat(deck): st-pete reveal.js scaffold + theme + hook slides"
```

---

### Task 2: Act 1 — the flood-repricing thesis

**Files:**
- Modify: `portfolio-site/deck/st-pete/index.html` (replace the `<!-- ACT 1 -->` anchor)

- [ ] **Step 1: Replace the `<!-- ACT 1 -->` line** with these six slides:

```html
    <!-- ===================== ACT 1 — THE THESIS ===================== -->
    <section>
      <h2>My criteria</h2>
      <ol>
        <li>Block construction</li>
        <li>Slab foundation</li>
        <li>FEMA Zone X (non-flood zone)</li>
        <li>Evac Zone E or non-evac</li>
        <li>≥ 20 ft above sea level (25–30 ideal)</li>
        <li>Not a flip</li>
      </ol>
      <aside class="notes">These are the hard disqualifiers — each one lowers the odds of a damaged, uninsurable, or overpriced home.</aside>
    </section>

    <section>
      <h2>The data</h2>
      <p><strong>Ten</strong> keyless public sources, joined at parcel / zip / sewershed grain:</p>
      <p>PCPAO parcels &amp; sales · permits · Zillow + Redfin metrics · Census ACS · FEMA NFIP claims · St-Pete stormwater &amp; sewer networks · USGS 3DEP elevation.</p>
      <p class="lead">Flood zones aren't a native parcel field — I spatial-joined FEMA FIRM maps to parcel lat/lon. Insurance is estimated per property.</p>
      <aside class="notes">Emphasize the real work: the sources don't share keys, and the most decision-relevant fields had to be derived.</aside>
    </section>

    <section>
      <h3>Finding 1 — the market's flood discount is ~3× too small</h3>
      <img src="../../assets/img/charts/flood-repricing.png" alt="One-time ~$27k market flood discount vs ~$85k realized 2024 NFIP payout per insured home.">
      <p>Buyers haircut a flood-zone home by ~9% (~<span class="stat">$27k</span>, one-time). One 2024 storm season paid ~<span class="stat">$85k</span> per insured home — <strong>~3× the lifetime discount, in one season.</strong></p>
      <aside class="notes">Subsidized flood insurance absorbed the cost so it never hit price. Risk Rating 2.0 is now unwinding that onto premiums, which DO capitalize into price.</aside>
    </section>

    <section>
      <h3>Finding 2 — it's an elevation story, two methods agree</h3>
      <img src="../../assets/img/charts/elevation-claims.png" alt="Take-up-normalized 2024 claims per 100 insured homes by elevation band — ~7× gradient coast to ridge.">
      <p>Model-free: low ground predicts 2024 claims (<span class="stat">ρ ≈ −0.77</span>) and the gradient <strong>survives</strong> normalizing for who bought insurance. A from-scratch cat-model reproduces it independently.</p>
      <aside class="notes">Two roads, same destination — the model-free claims gradient and the physics-based cat-model agree the dry ridge contributes ≈ $0.</aside>
    </section>

    <section>
      <h3>Finding 3 — FEMA Zone X is real high ground here</h3>
      <img src="../../assets/img/charts/zone-x-elevation.png" alt="Histogram of ground elevation for all St-Pete Zone-X parcels, median 29 ft, 0.1% below 8 ft.">
      <p>The skeptic's worry is stale maps hiding risk in cheap Zone-X homes. Not here: median Zone-X elevation is <span class="stat">29 ft</span>, only 0.1% below the surge-plausible 8 ft line. <em>(Caveat: holds in St-Pete, not county-wide.)</em></p>
      <aside class="notes">The "minimal-risk" label corresponds to genuine elevation — so a dry Zone-X home is on the right side of the repricing.</aside>
    </section>

    <section data-background-color="#3E1F14">
      <h2 style="color:#F2E9E4">The thesis</h2>
      <p style="color:#F2E9E4">Elevation is the hedge. Flood-zone homes carry <span style="color:#E0A03C">repricing downside</span> the current discount doesn't reflect — and the physical cost of flood risk dwarfs the price signal attached to it.</p>
      <aside class="notes">This is the spine of Act 1. Pause here before Phase II.</aside>
    </section>
```

- [ ] **Step 2: Verify**

```bash
cd /Users/beckpiscopo/Desktop/dev/portfolio-site
python3 -c "import html.parser; html.parser.HTMLParser().feed(open('deck/st-pete/index.html').read()); print('parses')"
for f in flood-repricing elevation-claims zone-x-elevation; do test -f assets/img/charts/$f.png && echo "$f ok"; done
```
Then in-browser: Act 1 slides advance, all three charts render on the isabelline bg, the dark thesis slide inverts correctly. Expected: `parses`, three `ok` lines.

- [ ] **Step 3: Commit**

```bash
git add deck/st-pete/index.html
git commit -m "feat(deck): Act 1 — flood-repricing thesis (findings 1-3 + thesis)"
```

---

### Task 3: Act 2 — Phase II (cat-model, hidden homes, breadth, rigor)

**Files:**
- Modify: `portfolio-site/deck/st-pete/index.html` (replace the `<!-- ACT 2 -->` anchor)

- [ ] **Step 1: Replace the `<!-- ACT 2 -->` line** with these five slides:

```html
    <!-- ===================== ACT 2 — PHASE II ===================== -->
    <section data-background-color="#3E1F14">
      <p class="meta" style="color:#BE7C4D">Phase II</p>
      <h2 style="color:#F2E9E4">Expanding the analysis to other forms of flooding</h2>
      <p class="lead" style="color:#F2E9E4">"Is this house safe from water?" turned out to mean more than storm surge — so the analysis grew into rainfall and the sewer system.</p>
      <aside class="notes">The transition: same question, wider lens. Surge, then pluvial (rain), then the sewer network itself.</aside>
    </section>

    <section>
      <h3>A from-scratch flood catastrophe model</h3>
      <div class="pipeline">
        <div class="mod"><b>Exposure</b><span>what's at risk (RCV, elevation)</span></div>
        <div class="arrow">→</div>
        <div class="mod"><b>Hazard</b><span>how deep the water</span></div>
        <div class="arrow">→</div>
        <div class="mod"><b>Vulnerability</b><span>% damage at depth</span></div>
        <div class="arrow">→</div>
        <div class="mod"><b>Financial</b><span>$ loss, NFIP terms</span></div>
      </div>
      <p>A deterministic four-module loss model over all St-Pete single-family parcels — ~<span class="stat">$2.6B</span> modeled 2024 NFIP loss, with an independent validation ladder. Modeled-vs-realized reconciles <strong>2.14× → 1.58×</strong> once you adjust for who actually held a policy.</p>
      <aside class="notes">The point: not a black box — a real actuarial chain, validated against independent NFIP claims, honest that the residual is model error (planar hazard, FFH).</aside>
    </section>

    <section>
      <h3>Finding 4 — the homes the flood map <em>and</em> my surge model both miss</h3>
      <img src="../../assets/img/charts/pluvial-hidden-homes.png" alt="Map of St-Pete with 1,130 homes highlighted: FEMA Zone X, cat-model-dry, yet top-quartile rain-drainage risk.">
      <p>Scoring every parcel on <em class="accent">pluvial</em> (rain-drainage) risk flags <span class="stat">1,130</span> homes that FEMA calls Zone X <em>and</em> my surge model leaves dry — yet sit low and under-drained. The local storm-drain layer Zillow and even First Street can't see.</p>
      <aside class="notes">This deepens Finding 3: Zone X is right about surge, but says nothing about rainfall. Honest: a relative screen, no event ground truth — suspects, not verdicts.</aside>
    </section>

    <section>
      <h2>It became a platform</h2>
      <p>I ingested the city's stormwater &amp; sanitary-sewer networks (St-Pete GeoHub) and built three vulnerability layers beyond surge:</p>
      <ul>
        <li><strong>Pluvial</strong> — rain ponding where drainage is under-served</li>
        <li><strong>Compound</strong> — surge submerges outfalls so rain can't drain</li>
        <li><strong>Sewer-overflow</strong> — inflow &amp; infiltration (clay pipe, unsealed manholes)</li>
      </ul>
      <aside class="notes">Four distinct water hazards, one parcel-level platform. Each is its own analysis with its own honest framing.</aside>
    </section>

    <section data-background-color="#3E1F14">
      <h2 style="color:#F2E9E4">Verify before you trust</h2>
      <ul style="color:#F2E9E4">
        <li>Caught that outfall elevations were stored in <span style="color:#E0A03C">centimeters</span>, not feet</li>
        <li>Coverage-tested a national sewer-overflow dataset → <span style="color:#E0A03C">zero Florida records</span></li>
        <li>Framed every index as <span style="color:#E0A03C">relative, not validated</span>; stated correlations honestly</li>
        <li>Linted the analysis code with a scientific-code linter</li>
      </ul>
      <p class="lead" style="color:#F2E9E4">Each check changed a conclusion or saved a wrong one.</p>
      <aside class="notes">This is the differentiator for technical reviewers — rigor and intellectual honesty, not just charts.</aside>
    </section>
```

- [ ] **Step 2: Verify**

```bash
cd /Users/beckpiscopo/Desktop/dev/portfolio-site
python3 -c "import html.parser; html.parser.HTMLParser().feed(open('deck/st-pete/index.html').read()); print('parses')"
test -f assets/img/charts/pluvial-hidden-homes.png && echo "hidden-homes ok"
grep -c "Phase II" deck/st-pete/index.html   # expect >=1
```
Then in-browser: the pipeline diagram renders as four boxes with arrows; the hidden-homes map shows; the two dark slides invert. Expected: `parses`, `hidden-homes ok`, Phase II count ≥ 1.

- [ ] **Step 3: Commit**

```bash
git add deck/st-pete/index.html
git commit -m "feat(deck): Act 2 — Phase II (cat-model, hidden homes, platform, rigor)"
```

---

### Task 4: Act 3 close, cross-links, and final verification

**Files:**
- Modify: `portfolio-site/deck/st-pete/index.html` (replace the `<!-- ACT 3 -->` anchor)
- Modify: `portfolio-site/projects/st-pete.html` (add a "Slides ↗" link)

- [ ] **Step 1: Replace the `<!-- ACT 3 -->` line** with these two slides:

```html
    <!-- ===================== ACT 3 — CLOSE ===================== -->
    <section>
      <h2>How it's built</h2>
      <p>Runs entirely locally — no cloud bill:</p>
      <p><strong>DuckDB + dbt</strong> (in-process warehouse + transforms) · <strong>Python</strong> ingestion · <strong>FastAPI</strong> · <strong>Next.js + MapLibre</strong> map UI · <strong>marimo</strong> notebooks · <strong>geopandas</strong>.</p>
      <aside class="notes">DuckDB in-process = no infrastructure, fast iteration — the right call for a single-user decision tool.</aside>
    </section>

    <section>
      <h2>The outcome</h2>
      <p>I found the house — trading some square footage for the criteria that keep it dry, insurable, and high. And the analysis stands as a reusable, multi-hazard property-risk platform.</p>
      <p class="meta">Beck Piscopo</p>
      <p>
        <a href="/projects/st-pete.html">Case study</a> ·
        <a href="https://github.com/beckpiscopo/st-pete-housing-analytics" target="_blank" rel="noopener">Repo</a> ·
        <a href="/notebooks/st-pete/00_overview.html" target="_blank" rel="noopener">Notebooks</a>
      </p>
      <aside class="notes">Close on the human outcome + the artifact. Point to the deeper material.</aside>
    </section>
```

- [ ] **Step 2: Add a "Slides ↗" link to the case study.** In `projects/st-pete.html`, find the metadata link row:

```html
        <a class="link" href="https://github.com/beckpiscopo/st-pete-housing-analytics" target="_blank" rel="noopener">Repo ↗</a>
      </div>
```
Replace with:

```html
        <a class="link" href="https://github.com/beckpiscopo/st-pete-housing-analytics" target="_blank" rel="noopener">Repo ↗</a>
        <a class="link" href="/deck/st-pete/" target="_blank" rel="noopener">Slides ↗</a>
      </div>
```

- [ ] **Step 3: Final verification**

```bash
cd /Users/beckpiscopo/Desktop/dev/portfolio-site
python3 -c "import html.parser; html.parser.HTMLParser().feed(open('deck/st-pete/index.html').read()); print('deck parses')"
grep -c "<section" deck/st-pete/index.html            # expect 15 (2+6+5+2)
grep -c "aside class=\"notes\"" deck/st-pete/index.html # expect 13 (all but the 2 pure-transition? count >=13)
grep -c "Slides ↗" projects/st-pete.html               # expect 1
for f in flood-repricing elevation-claims zone-x-elevation pluvial-hidden-homes; do test -f assets/img/charts/$f.png && echo "$f ok"; done
```
Then in a browser: step through all ~15 slides start to finish — every chart renders, the pipeline diagram and dark slides look right, speaker-notes view (`S` key) works, and `deck/st-pete/?print-pdf` produces a clean multi-page PDF. The case-study "Slides ↗" link opens the deck. Expected: `deck parses`, ~15 sections, the four `ok` lines, `Slides ↗` count 1.

- [ ] **Step 4: Commit**

```bash
git add deck/st-pete/index.html projects/st-pete.html
git commit -m "feat(deck): Act 3 close + cross-link deck and case study"
```

---

## Self-Review

**Spec coverage:**
- reveal.js CDN, single file at `deck/st-pete/index.html`, themed → Task 1 ✓
- 3-act ~15-slide arc; Act 2 titled "Phase II: expanding the analysis to other forms of flooding" → Tasks 1–4 (Task 3 Step 1 title) ✓
- Findings 1–4 with the four reused PNGs → Tasks 2, 3 ✓
- Slide 9 in-slide pipeline diagram, no new chart → Task 3 Step 1 (`.pipeline`) ✓
- Rigor/honesty slide → Task 3 ✓
- Stack + close → Task 4 ✓
- Speaker notes + PDF export → notes on content slides; `?print-pdf` verified Task 4 ✓
- Deck ↔ case study cross-link → Task 4 Steps 1–2 ✓
- No new analysis / single repo → Global Constraints; no `st_pete_analytics` task ✓

**Placeholder scan:** every slide's exact markup + copy + chart path + speaker note is provided; numbers are the verbatim values from Global Constraints. No TBD/TODO.

**Consistency:** chart filenames (`flood-repricing`, `elevation-claims`, `zone-x-elevation`, `pluvial-hidden-homes`) and the `../../assets/img/charts/` relative path are identical across Task 1 (path note), Tasks 2–3 (`<img>`), and Task 4 (verify). The three anchors created in Task 1 are each replaced exactly once (Tasks 2/3/4). Section count: Act 0 (2) + Act 1 (6) + Act 2 (5) + Act 3 (2) = 15, matching the Task 4 verification. The `/deck/st-pete/` link (Task 4 Step 2) matches the file location.
