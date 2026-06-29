# St-Pete Case Study — Water-Findings Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the new multi-hazard water findings (pluvial drainage risk + the stormwater/sewer networks) to the St-Pete portfolio case study **without bloating it** — one new headline finding, one new chart, three new notebook links, light breadth touches.

**Architecture:** Two repos. `st_pete_analytics` generates the assets (one new chart PNG + three exported notebook HTMLs) reusing the real analysis so numbers match. `portfolio-site` consumes them with a tight, surgical edit to `projects/st-pete.html` that deepens the existing 3-finding arc into 4.

**Tech Stack:** Python (matplotlib/duckdb/geopandas) for asset generation; static HTML + Tailwind for the page.

## Global Constraints

- **Concision is the point.** Net page growth budget: Finding 4 ≤ ~120 words + 1 figure; the breadth touch = 1 sentence; ≤ 1 new "What I learned" bullet; 3 new notebook links; 3 new data-table rows. **No new top-level sections.** The page stays a 4-finding story, not a sprawl.
- **Numbers must match the real analysis** — the new chart and copy come from `parcel_pluvial_risk` + the cat-model, not hand-typed. The hidden-set count is **1,130** (top-quartile pluvial ∩ FEMA Zone X ∩ cat-model-dry, over the ~82,681 cat-model-covered SFR parcels).
- **Honesty matches the rest of the page:** the pluvial index is a *relative* screen, not a validated probability; it correlates with surge through shared elevation (it is NOT statistically independent) — the operative claim is the hidden *set*, not orthogonality. There is no overflow-event ground truth.
- Repo paths: analytics repo = `/Users/beckpiscopo/Desktop/dev/st_pete_analytics`; portfolio repo = `/Users/beckpiscopo/Desktop/dev/portfolio-site`.
- Chart PNGs live in `portfolio-site/assets/img/charts/`; the page cache-busts via `?v=` query strings in the HTML (filenames are unversioned).
- Conventional commits. The portfolio repo is the home of this plan; commits land in whichever repo a task modifies.

---

### Task 1: Generate the "pluvial hidden homes" chart

**Files:**
- Modify: `st_pete_analytics/scripts/export_portfolio_charts.py` (add one export function + call it in `main`)
- Create (output): `portfolio-site/assets/img/charts/pluvial-hidden-homes.png`

**Interfaces:**
- Consumes: DuckDB `parcel_pluvial_risk`, `parcels`; `analysis.catmodel.exposure.load_exposure`, `analysis.catmodel.hazard.{load_hwm,assign_flood_depth}`.
- Produces: the PNG; prints the hidden-set count for verification.

Work from: `/Users/beckpiscopo/Desktop/dev/st_pete_analytics`.

- [ ] **Step 1: Add the export function** to `scripts/export_portfolio_charts.py` (above `main`). It reproduces the canonical hidden set (tiers over ALL scored parcels, restricted to cat-model-covered parcels — this yields 1,130):

```python
def export_pluvial_hidden_homes(con, out_dir):
    """Map the 1,130 homes that are FEMA Zone X AND cat-model-dry yet top-quartile pluvial risk."""
    import pandas as pd
    from analysis.catmodel import exposure, hazard

    risk = con.execute(
        """
        SELECT r.parcel_id, r.pluvial_risk_score, p.flood_zone, p.latitude, p.longitude
        FROM parcel_pluvial_risk r JOIN parcels p ON r.parcel_id = p.parcel_id
        WHERE r.pluvial_risk_score IS NOT NULL
        """
    ).df()
    risk["tier"] = pd.qcut(risk["pluvial_risk_score"], 4, labels=["Q1", "Q2", "Q3", "Q4"])
    exp = exposure.load_exposure(con)
    exp = hazard.assign_flood_depth(exp, hazard.load_hwm(con), max_dist_km=60)
    m = risk.merge(exp[["parcel_id", "depth_ft"]], on="parcel_id", how="inner")
    hidden = m[(m["tier"] == "Q4") & (m["flood_zone"] == "X")
              & (m["depth_ft"] <= 0) & (m["depth_ft"] > -9999)]
    print(f"pluvial hidden homes: {len(hidden):,} of {len(m):,} cat-model-covered parcels")

    fig, ax = plt.subplots(figsize=(8, 8))
    ax.scatter(m["longitude"], m["latitude"], s=2, color="#dcdcdc", linewidths=0, label="cat-model-covered parcels")
    ax.scatter(hidden["longitude"], hidden["latitude"], s=9, color="#cb181d", linewidths=0,
               label=f"hidden pluvial risk (n={len(hidden):,})")
    ax.set_aspect(1 / np.cos(np.radians(27.77)))
    ax.set_title("Homes the flood map AND the surge model both miss\nZone X · cat-model-dry · top-quartile rain-drainage risk")
    ax.set_xlabel("longitude"); ax.set_ylabel("latitude")
    ax.legend(loc="upper right", markerscale=2, fontsize=8)
    fig.tight_layout()
    fig.savefig(out_dir / "pluvial-hidden-homes.png", dpi=130)
    plt.close(fig)
```

- [ ] **Step 2: Call it in `main`.** Find where `main()` opens the DuckDB connection and writes to the charts dir (existing chart calls). Add `export_pluvial_hidden_homes(con, OUT_DIR)` alongside them (match the existing variable names for the connection and output dir — read the file's `main` to get them exact).

- [ ] **Step 3: Run it and verify the count**

Run: `cd /Users/beckpiscopo/Desktop/dev/st_pete_analytics && uv run python scripts/export_portfolio_charts.py`
Expected: prints `pluvial hidden homes: 1,130 of ~82,681 cat-model-covered parcels`, and `portfolio-site/assets/img/charts/pluvial-hidden-homes.png` exists. If the count is not 1,130, STOP and report (the tiering population or filter drifted).

- [ ] **Step 4: Commit (analytics repo)**

```bash
cd /Users/beckpiscopo/Desktop/dev/st_pete_analytics
git add scripts/export_portfolio_charts.py
git commit -m "feat(scripts): export pluvial hidden-homes chart for the portfolio case study"
```
(The PNG lands in the portfolio repo and is committed there in Task 3.)

---

### Task 2: Export notebooks 10–12 and stage them in the portfolio

**Files:**
- Modify: `st_pete_analytics/scripts/export_notebooks.py` (add 3 entries to `NOTEBOOKS`)
- Create (output, copied): `portfolio-site/notebooks/st-pete/10_stormwater_network.html`, `11_pluvial_risk.html`, `12_sewer_overflow.html`

Work from: `/Users/beckpiscopo/Desktop/dev/st_pete_analytics`.

- [ ] **Step 1: Add the three notebooks to the `NOTEBOOKS` list** in `scripts/export_notebooks.py`, after `"09_flood_repricing"`:

```python
    "10_stormwater_network",
    "11_pluvial_risk",
    "12_sewer_overflow",
```

- [ ] **Step 2: Run the export**

Run: `cd /Users/beckpiscopo/Desktop/dev/st_pete_analytics && uv run python scripts/export_notebooks.py`
Expected: writes `exports/notebooks/10_stormwater_network.html`, `11_pluvial_risk.html`, `12_sewer_overflow.html` (among the others). If marimo export errors on a notebook, STOP and report the notebook + error.

- [ ] **Step 3: Copy the three new HTMLs into the portfolio**

```bash
cp /Users/beckpiscopo/Desktop/dev/st_pete_analytics/exports/notebooks/{10_stormwater_network,11_pluvial_risk,12_sewer_overflow}.html \
   /Users/beckpiscopo/Desktop/dev/portfolio-site/notebooks/st-pete/
ls -la /Users/beckpiscopo/Desktop/dev/portfolio-site/notebooks/st-pete/1[012]_*.html
```
Expected: the three files exist in `portfolio-site/notebooks/st-pete/`.

- [ ] **Step 4: Commit (analytics repo — the script change only)**

```bash
cd /Users/beckpiscopo/Desktop/dev/st_pete_analytics
git add scripts/export_notebooks.py
git commit -m "chore(scripts): export notebooks 10-12 (stormwater/pluvial/sewer) to HTML"
```
(The copied HTMLs land in the portfolio repo and are committed there in Task 3.)

---

### Task 3: Edit the case-study page + commit portfolio assets

**Files:**
- Modify: `portfolio-site/projects/st-pete.html`
- Adds (commit): the chart PNG (Task 1) + the three notebook HTMLs (Task 2)

Work from: `/Users/beckpiscopo/Desktop/dev/portfolio-site`.

**Interfaces:**
- Consumes: `assets/img/charts/pluvial-hidden-homes.png` (Task 1); `notebooks/st-pete/1{0,1,2}_*.html` (Task 2).

- [ ] **Step 1: Add Finding 4** — insert immediately before the closing `</section>` of the "What the data showed" section (after the Zone-X figure, currently around line 154–155):

```html
        <!-- Finding 4 — the deepening: a hazard surge + FEMA both miss -->
        <h3 class="mb-3 mt-14 max-w-3xl">The hazard the flood map <em>and</em> my own surge model both miss: rainfall</h3>
        <p class="max-w-3xl">Surge isn't the only way water reaches a house. I ingested St. Pete's actual storm-drain network (~22k inlets, ~4k outfalls) and scored every parcel on <em class="accent">pluvial</em> risk — low ground that's poorly served by drainage, where heavy rain ponds with nowhere to go. It flags <strong>1,130 homes that FEMA calls Zone X <em>and</em> my surge model leaves bone-dry</strong>, yet sit low and under-drained — the inland-Largo caveat above, now mapped citywide. It's the local-infrastructure layer Zillow and even First Street structurally can't see. <em>Honest caveat:</em> a relative screen, not a validated probability — there's no public record of where it actually floods, so this points at suspects, not verdicts.</p>
        <figure class="figure">
          <div class="figure-frame"><img src="../assets/img/charts/pluvial-hidden-homes.png?v=20260629" alt="Map of St. Pete parcels with 1,130 homes highlighted that are FEMA Zone X, dry in the surge model, yet top-quartile rain-drainage risk."></div>
          <figcaption class="figcaption">The 1,130 "hidden" homes: FEMA Zone X, dry in the cat-model, but top-quartile pluvial (rain-drainage) risk. Built from the city's storm-drain network — the layer the flood maps don't encode.</figcaption>
        </figure>
```

- [ ] **Step 2: Nuance Finding 3** — in the Zone-X paragraph (currently line 150), append one sentence to the end of the paragraph (before `</p>`), so Findings 3→4 read as an arc:

Find: `still took ~$26M in rain-driven flooding.)`
Replace with: `still took ~$26M in rain-driven flooding.) Zone X is trustworthy about <em>surge</em> — but it says nothing about rainfall and drainage, which is its own layer (next).`

- [ ] **Step 3: Add the breadth sentence** to "How I built it" — append to the end of the first paragraph (currently ends line 159, "...single-user decision tool."):

Find: `the right call for a single-user decision tool.</p>`
Replace with: `the right call for a single-user decision tool. The latest extension ingests the city's stormwater and sanitary-sewer networks (St. Pete GeoHub) and adds two more vulnerability layers — pluvial drainage risk and an I&amp;I sewer-overflow index — beyond the original surge model.</p>`

- [ ] **Step 4: Update the data table + counts.** Add three rows after the "Listings" row (line 198), inside `<tbody>`:

```html
              <tr><td>Stormwater network</td><td>1 row / asset</td><td>St. Pete GeoHub</td></tr>
              <tr><td>Wastewater network</td><td>1 row / asset</td><td>St. Pete GeoHub</td></tr>
              <tr><td>Ground elevation</td><td>per parcel</td><td>USGS 3DEP DEM</td></tr>
```
Then update the two source-count phrases from seven to ten:
- Line ~122: `Seven sources, joined at the parcel and zip level:` → `Ten sources, joined at the parcel, zip, and sewershed level:`
- Line ~185: `Seven public sources, joined at the parcel and zip level.` → `Ten public sources, joined at the parcel, zip, and sewershed level.`

- [ ] **Step 5: Add the three notebook links** — after the notebook-09 `<li>` (line 224):

```html
          <li><a class="link" href="../notebooks/st-pete/10_stormwater_network.html" target="_blank" rel="noopener">10 · Stormwater &amp; sewer network (foundation) ↗</a></li>
          <li><a class="link" href="../notebooks/st-pete/11_pluvial_risk.html" target="_blank" rel="noopener">11 · Pluvial (rain-drainage) risk ↗</a></li>
          <li><a class="link" href="../notebooks/st-pete/12_sewer_overflow.html" target="_blank" rel="noopener">12 · Sewer-overflow vulnerability ↗</a></li>
```

- [ ] **Step 6: Add one "What I learned" bullet** — after the last `<li>` in the "What I learned" list (line 179), add:

```html
          <li class="flex gap-3"><span class="accent select-none" aria-hidden="true">—</span><span>Verify the data before trusting it. This round I found outfall elevations were stored in centimeters (not feet), coverage-tested a national sewer-overflow dataset and discovered it carries zero Florida records, and ran a scientific-code linter over the analysis — each one changed a conclusion or saved a wrong one.</span></li>
```

- [ ] **Step 7: Verify the page renders and resolves**

```bash
cd /Users/beckpiscopo/Desktop/dev/portfolio-site
python3 -c "import html.parser,sys; html.parser.HTMLParser().feed(open('projects/st-pete.html').read()); print('html parses')"
test -f assets/img/charts/pluvial-hidden-homes.png && echo "chart present"
for n in 10_stormwater_network 11_pluvial_risk 12_sewer_overflow; do test -f notebooks/st-pete/$n.html && echo "$n ok"; done
grep -c "pluvial-hidden-homes.png" projects/st-pete.html   # expect 1
grep -c "Ten" projects/st-pete.html                         # expect >=2
```
Expected: `html parses`, `chart present`, three `ok` lines, and the grep counts. Then open `projects/st-pete.html` in a browser (or `npm run` build if the project uses one — check `package.json`) and eyeball: Finding 4 renders with its map, the three new notebook links work, no broken layout.

- [ ] **Step 8: Commit (portfolio repo)**

```bash
cd /Users/beckpiscopo/Desktop/dev/portfolio-site
git add projects/st-pete.html assets/img/charts/pluvial-hidden-homes.png \
        notebooks/st-pete/10_stormwater_network.html notebooks/st-pete/11_pluvial_risk.html notebooks/st-pete/12_sewer_overflow.html
git commit -m "feat(st-pete): add pluvial hidden-homes finding + stormwater/sewer breadth + notebooks 10-12"
```

---

## Self-Review

**Coverage of the agreed edits:**
- Finding 4 (pluvial / 1,130 hidden homes) + chart → Task 1 (chart), Task 3 Step 1 ✓
- Finding 3 nuance (surge vs rainfall) → Task 3 Step 2 ✓
- Breadth (stormwater/sewer networks + sewer-overflow index) → Task 3 Step 3 ✓
- Data table + count update → Task 3 Step 4 ✓
- Notebook links 10–12 (+ exports) → Task 2, Task 3 Step 5 ✓
- "What I learned" rigor bullet → Task 3 Step 6 ✓
- Concision budget enforced in Global Constraints (no new sections; bounded additions) ✓

**Placeholder scan:** every step has exact HTML/code and exact find/replace strings; the chart count is a hard expected value (1,130) with a STOP condition if it drifts. No TBD/TODO.

**Consistency:** the chart filename `pluvial-hidden-homes.png` is identical in Task 1 (write), Task 3 Step 1 (`<img src>`), and Task 3 Step 8 (commit). Notebook filenames `1{0,1,2}_*.html` match between Task 2 (export/copy) and Task 3 Step 5 (links) and Step 8 (commit). The `?v=20260629` cache-bust is on the new image only (existing charts unchanged, so their versions stay).

**Honesty check:** Finding 4 copy states "relative screen, not a validated probability" and "suspects, not verdicts" — does not claim orthogonality to surge or a validated prediction, consistent with the analysis (pluvial↔surge are correlated through elevation; the claim is the hidden *set*).
