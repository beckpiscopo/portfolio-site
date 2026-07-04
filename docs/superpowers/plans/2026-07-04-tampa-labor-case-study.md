# Tampa Bay Labor-Market Case Study — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Tampa Bay Labor-Market Analysis` case-study page to the portfolio, built from the already-shipped OEWS+ACS labor analysis, reusing the property-page template, with four static charts, three linked notebooks, and a homepage card — written in Beck's plain voice.

**Architecture:** Two repos. `st_pete_analytics` holds the generators (chart-export script + notebook-export) that read `analytics.db` and write PNGs and static-HTML into the `portfolio-site` tree. `portfolio-site` holds the page, the homepage card, and the committed generated artifacts. No new analysis; every number is already computed and verified.

**Tech Stack:** Python (matplotlib, duckdb) for chart export, marimo for notebook HTML, static HTML + Tailwind for the page.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-04-tampa-labor-case-study-design.md`.
- **Two repos / two locations:**
  - `st_pete_analytics` (at `/Users/beckpiscopo/Desktop/dev/st_pete_analytics`) — the generator scripts. Its `analytics.db` (gitignored) has the data. Run scripts with `uv run python ...`. Commit script changes here on a branch `feat/labor-portfolio-export`.
  - `portfolio-site` (at `/Users/beckpiscopo/Desktop/dev/portfolio-site`) — the page + committed artifacts. Branch `feat/tampa-labor-case-study` (already created, spec already committed here).
  - The chart-export `OUT` path already resolves to `portfolio-site/assets/img/charts/`; the notebook export must target `portfolio-site/notebooks/tampa-labor/`. So running the generators in `st_pete_analytics` deposits files into the `portfolio-site` working tree, which are then committed on the portfolio-site branch.
- **Voice & prose rules (verbatim from the spec — govern all page copy):** first person, past tense, plain and concrete. No AI-vocabulary words (delve, showcase, leverage, robust, crucial, pivotal, tapestry, testament, underscore, landscape, vibrant, boasts, seamless, intricate, foster, garner, realm, navigate, bolster, myriad, nuanced). No negative parallelisms ("not just X, but Y"; "it's not X, it's Y"). No rule-of-three filler. No hollow "-ing" tails or inflated-significance statements. Plain verbs (keep "is/are"). Sentence-case headings, bold only on real numbers, straight quotes, em-dashes sparingly. Every number matches the analysis.
- **Verified numbers (use verbatim):** metro total jobs 1,447,120; top groups Office & Administrative Support 185,560, Sales 147,430, Food Prep & Serving 138,090, Business & Financial 118,550, Management 113,290, Transportation 109,720, Healthcare Practitioners 106,810; Computer & Mathematical 50,900 = #12 of 22, LQ 1.04, mean wage $108,860 (US $120,080 → 91%); specialization LQ Legal 1.43, Business & Financial 1.21, Sales 1.18; wage median span ~$33,000–$117,690; residence-vs-workplace metro: Management/business/science/arts residents 42.2% vs workplace 37.1%, Service jobs 20.2% vs residents 16.5%; St. Pete city LF 144,814 / unemp 4.9% / BA+ 41.3% / median earnings $47,668 / median HH income $73,118; Pinellas unemp 4.5% / BA+ 35.8%; metro unemp 4.7% / BA+ 34.0% / HH income $71,254.
- Commit footer (every commit, both repos):
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01X4omLqZJ2rq5GzC3Jj2mXz
  ```
- **Deferred (not in this plan):** cross-linking the two St. Pete/Tampa pages — the user hasn't decided how; leave both pages un-cross-linked for now.

## File Structure

- `st_pete_analytics/scripts/export_portfolio_charts.py` — append 4 labor chart blocks (modify).
- `st_pete_analytics/scripts/export_labor_notebooks.py` — new small script: export the 3 labor notebooks to `portfolio-site/notebooks/tampa-labor/` (create).
- `portfolio-site/assets/img/charts/labor-*.png` — 4 generated charts (committed on portfolio-site).
- `portfolio-site/notebooks/tampa-labor/*.html` — 3 generated notebooks (committed on portfolio-site).
- `portfolio-site/projects/tampa-labor.html` — the page (create).
- `portfolio-site/index.html` — add the project card (modify).
- `portfolio-site/assets/img/projects/tampa-labor.png` — homepage thumbnail (copied from a chart).

---

### Task 1: Labor chart export (st_pete_analytics)

**Repo:** `st_pete_analytics`, branch `feat/labor-portfolio-export`.

**Files:**
- Modify: `scripts/export_portfolio_charts.py` (append 4 chart blocks at the end, before any trailing `conn.close()` if present; match the existing linear block style + `save(fig, name)` + palette).

- [ ] **Step 1: Create the branch**

```bash
cd /Users/beckpiscopo/Desktop/dev/st_pete_analytics && git checkout -b feat/labor-portfolio-export
```

- [ ] **Step 2: Append the 4 chart blocks to `scripts/export_portfolio_charts.py`**

Append at the end of the file (the script already defines `conn`, `save`, the palette `BG/INK/CARAMEL/JASPER/MUTED`, and imports `plt`, `pd`, `np`):

```python
# ---------------------------------------------------------------------------
# Labor-market case study (Tampa Bay Labor-Market Analysis)
# Numbers match analysis/labor_force_profile.py (OEWS) and the ACS tables.
# ---------------------------------------------------------------------------

# 1 — Occupation mix: employment by SOC major group, tech highlighted.
_maj = conn.execute("""
    SELECT soc_title, tot_emp FROM oews_occupation
    WHERE area_fips='0045300' AND soc_level='major' ORDER BY tot_emp
""").fetchdf()
_soc = conn.execute("""
    SELECT soc_code, soc_title FROM oews_occupation
    WHERE area_fips='0045300' AND soc_level='major'
""").fetchdf()
_tech_titles = set(_soc[_soc.soc_code == "15-0000"].soc_title)
fig, ax = plt.subplots(figsize=(8, 8))
_colors = [JASPER if t in _tech_titles else CARAMEL for t in _maj.soc_title]
ax.barh(_maj.soc_title, _maj.tot_emp, color=_colors)
ax.set_title("Employment by occupation group — Tampa Bay metro (2025)")
ax.set_xlabel("workers")
ax.grid(axis="x", alpha=0.3)
fig.tight_layout()
save(fig, "labor-occupation-mix.png")

# 2 — Specialization: location quotient vs U.S., reference line at 1.0.
_lq = conn.execute("""
    SELECT soc_title, occ_lq_bls FROM oews_occupation
    WHERE area_fips='0045300' AND soc_level='major' AND occ_lq_bls IS NOT NULL
    ORDER BY occ_lq_bls
""").fetchdf()
fig, ax = plt.subplots(figsize=(8, 8))
_colors = [CARAMEL if v >= 1 else MUTED for v in _lq.occ_lq_bls]
ax.barh(_lq.soc_title, _lq.occ_lq_bls, color=_colors)
ax.axvline(1.0, color=INK, lw=0.8, ls="--")
ax.set_title("What the metro over-indexes on — location quotient vs U.S. (2025)")
ax.set_xlabel("location quotient (1.0 = national average)")
ax.grid(axis="x", alpha=0.3)
fig.tight_layout()
save(fig, "labor-specialization-lq.png")

# 3 — Wage spread: 10th-90th percentile with median marked, sorted by median.
_w = conn.execute("""
    SELECT soc_title, a_pct10, a_median, a_pct90 FROM oews_occupation
    WHERE area_fips='0045300' AND soc_level='major'
      AND a_pct10 IS NOT NULL AND a_pct90 IS NOT NULL
    ORDER BY a_median
""").fetchdf()
_y = range(len(_w))
fig, ax = plt.subplots(figsize=(8, 8))
ax.hlines(list(_y), _w.a_pct10, _w.a_pct90, color=MUTED, lw=4)
ax.plot(_w.a_median, list(_y), "o", color=JASPER)
ax.set_yticks(list(_y)); ax.set_yticklabels(_w.soc_title)
ax.set_title("Annual pay by occupation — 10th to 90th percentile, median marked (2025)")
ax.set_xlabel("annual wage ($)")
ax.grid(axis="x", alpha=0.3)
fig.tight_layout()
save(fig, "labor-wage-spread.png")

# 4 — Residence (ACS) vs workplace (OEWS) occupation mix, metro, 5 broad categories.
_crosswalk = {
    "Management, business, science, & arts": ["11-0000","13-0000","15-0000","17-0000","19-0000","21-0000","23-0000","25-0000","27-0000","29-0000"],
    "Service": ["31-0000","33-0000","35-0000","37-0000","39-0000"],
    "Sales & office": ["41-0000","43-0000"],
    "Natural resources, construction, & maintenance": ["45-0000","47-0000","49-0000"],
    "Production, transportation, & material moving": ["51-0000","53-0000"],
}
_oe = dict(conn.execute("""
    SELECT soc_code, tot_emp FROM oews_occupation
    WHERE area_fips='0045300' AND soc_level='major'
""").fetchall())
_work = {c: sum(_oe.get(s, 0) for s in ss) for c, ss in _crosswalk.items()}
_work_tot = sum(_work.values())
_res = dict(conn.execute("""
    SELECT occ_group, employed FROM acs_occupation_residence
    WHERE geo_id='45300' AND occ_group<>'Total'
""").fetchall())
_res_tot = sum(_res.values())
_cats = list(_crosswalk.keys())
_work_share = [100 * _work[c] / _work_tot for c in _cats]
_res_share = [100 * _res.get(c, 0) / _res_tot for c in _cats]
_short = [c.split(",")[0].split(" &")[0].split(" occupations")[0][:22] for c in _cats]
_y = range(len(_cats))
fig, ax = plt.subplots(figsize=(8.5, 5))
ax.barh([i + 0.2 for i in _y], _work_share, height=0.4, label="workplace (OEWS)", color=CARAMEL)
ax.barh([i - 0.2 for i in _y], _res_share, height=0.4, label="residence (ACS)", color=JASPER)
ax.set_yticks(list(_y)); ax.set_yticklabels(_short)
ax.set_title("Where jobs are (OEWS) vs where workers live (ACS) — Tampa Bay metro")
ax.set_xlabel("share of employment (%)")
ax.legend(); ax.grid(axis="x", alpha=0.3)
fig.tight_layout()
save(fig, "labor-residence-vs-workplace.png")
```

- [ ] **Step 3: Run the export**

Run: `cd /Users/beckpiscopo/Desktop/dev/st_pete_analytics && uv run python scripts/export_portfolio_charts.py`
Expected: the run prints `wrote .../portfolio-site/assets/img/charts/labor-occupation-mix.png` and the other three, with no traceback. (It also re-writes the existing flood charts — that's fine, they're unchanged.)

- [ ] **Step 4: Verify the 4 PNGs exist and the numbers behind them are right**

Run:
```bash
cd /Users/beckpiscopo/Desktop/dev/st_pete_analytics
ls -la ../portfolio-site/assets/img/charts/labor-*.png
uv run python -c "
import duckdb; c=duckdb.connect('analytics.db', read_only=True)
print('top group', c.execute(\"select soc_title, tot_emp from oews_occupation where area_fips='0045300' and soc_level='major' order by tot_emp desc limit 1\").fetchone())
print('tech LQ', c.execute(\"select occ_lq_bls from oews_occupation where area_fips='0045300' and soc_code='15-0000'\").fetchone()[0])
print('legal LQ', c.execute(\"select occ_lq_bls from oews_occupation where area_fips='0045300' and soc_code='23-0000'\").fetchone()[0])
"
```
Expected: 4 labor PNGs listed; `top group ('Office & Administrative Support', 185560)`; `tech LQ 1.04`; `legal LQ 1.43`.

- [ ] **Step 5: Commit (st_pete_analytics)**

```bash
cd /Users/beckpiscopo/Desktop/dev/st_pete_analytics
git add scripts/export_portfolio_charts.py
git commit -m "feat(charts): export Tampa Bay labor-market case-study charts

$(printf 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01X4omLqZJ2rq5GzC3Jj2mXz')"
```

(The 4 PNGs now sit untracked in the portfolio-site tree; Task 3 commits them there.)

---

### Task 2: Labor notebook export (st_pete_analytics)

**Repo:** `st_pete_analytics`, same branch `feat/labor-portfolio-export`.

**Files:**
- Create: `scripts/export_labor_notebooks.py`

- [ ] **Step 1: Create `scripts/export_labor_notebooks.py`**

```python
"""Export the three labor-market marimo notebooks to static HTML for the portfolio.

Output: portfolio-site/notebooks/tampa-labor/*.html (committed on the portfolio-site side).
Run from the st_pete_analytics repo root: uv run python scripts/export_labor_notebooks.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

# (output name, source path relative to analysis/)
NOTEBOOKS = [
    ("labor_force_profile", "labor_force_profile.py"),
    ("oews_pipeline", "pipelines/oews_pipeline.py"),
    ("acs_labor_pipeline", "pipelines/acs_labor_pipeline.py"),
]


def _root() -> Path:
    for d in [Path.cwd(), *Path.cwd().parents]:
        if (d / "analytics.db").exists():
            return d
    raise FileNotFoundError("analytics.db not found walking up from cwd")


def main() -> int:
    root = _root()
    out_dir = root.parent / "portfolio-site" / "notebooks" / "tampa-labor"
    out_dir.mkdir(parents=True, exist_ok=True)
    failures = []
    for name, rel in NOTEBOOKS:
        src = root / "analysis" / rel
        if not src.exists():
            failures.append(f"missing: {src}")
            continue
        dst = out_dir / f"{name}.html"
        print(f"exporting {name} ...", flush=True)
        r = subprocess.run(
            ["marimo", "export", "html", str(src), "-o", str(dst)],
            capture_output=True, text=True,
        )
        if r.returncode != 0 or "some cells failed" in (r.stderr + r.stdout):
            failures.append(f"{name}: {r.stderr.strip()[:200]}")
    if failures:
        print("\nFAILURES:")
        for f in failures:
            print("  -", f)
        return 1
    print(f"\nWrote {len(NOTEBOOKS)} notebooks to {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run it**

Run: `cd /Users/beckpiscopo/Desktop/dev/st_pete_analytics && uv run python scripts/export_labor_notebooks.py`
Expected: three "exporting …" lines then `Wrote 3 notebooks to .../portfolio-site/notebooks/tampa-labor`. (If a `marimo edit` session holds `analytics.db`, the read-only export still works; if any notebook reports "some cells failed", investigate before proceeding.)

- [ ] **Step 3: Verify the 3 HTML files exist and are non-trivial**

Run: `ls -la ../portfolio-site/notebooks/tampa-labor/*.html && wc -c ../portfolio-site/notebooks/tampa-labor/*.html`
Expected: `labor_force_profile.html`, `oews_pipeline.html`, `acs_labor_pipeline.html`, each tens–hundreds of KB (not near-zero).

- [ ] **Step 4: Commit (st_pete_analytics)**

```bash
cd /Users/beckpiscopo/Desktop/dev/st_pete_analytics
git add scripts/export_labor_notebooks.py
git commit -m "feat(notebooks): export labor-market notebooks to portfolio static HTML

$(printf 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01X4omLqZJ2rq5GzC3Jj2mXz')"
```

(The 3 HTML files now sit untracked in the portfolio-site tree; Task 3 commits them.)

---

### Task 3: The case-study page (portfolio-site)

**Repo:** `portfolio-site`, branch `feat/tampa-labor-case-study`.

**Files:**
- Create: `projects/tampa-labor.html`
- Commit (generated in Tasks 1–2): `assets/img/charts/labor-*.png` (4), `notebooks/tampa-labor/*.html` (3)

- [ ] **Step 1: Create `projects/tampa-labor.html` from the property-page shell**

Copy `projects/st-pete.html` to `projects/tampa-labor.html`, then keep the `<head>`, the dark-toggle button, `#mobile-bar`, `#sidebar`, and the two trailing `<script>` blocks **byte-for-byte identical** (same `dist/output.css` version, same `site.js`). Change only the `<title>` and the `<main>` content. Set:

```html
<title>Tampa Bay Labor-Market Analysis · Beck Piscopo</title>
```

Replace the entire `<main>…</main>` with the following (this is the page copy — written in the plain voice; every number matches the analysis):

```html
    <main class="max-w-4xl mx-auto px-6 py-16 md:py-24">
      <a class="link" href="/#projects">← Projects</a>

      <h1 class="font-bold mt-5 mb-3">Tampa Bay Labor-Market Analysis</h1>
      <p class="lead italic mb-8 max-w-3xl">What the Tampa Bay economy runs on, and why where people work isn't where they live</p>

      <dl class="flex flex-wrap gap-x-10 gap-y-3 mb-5 pb-6 border-b border-faint-soft">
        <div>
          <dt class="text-sm uppercase tracking-wide opacity-50">Role</dt>
          <dd class="text-lg">Solo (data pipeline, analysis, write-up)</dd>
        </div>
        <div>
          <dt class="text-sm uppercase tracking-wide opacity-50">Timeline</dt>
          <dd class="text-lg">Personal project · 2026</dd>
        </div>
        <div>
          <dt class="text-sm uppercase tracking-wide opacity-50">Stack</dt>
          <dd class="text-lg">BLS OEWS · Census ACS · DuckDB · dbt · marimo</dd>
        </div>
      </dl>
      <div class="flex flex-wrap gap-5 mb-14 text-lg">
        <a class="link" href="https://github.com/beckpiscopo/st-pete-housing-analytics" target="_blank" rel="noopener">Repo ↗</a>
      </div>

      <section class="mb-16 md:mb-20 max-w-3xl">
        <h2 class="font-bold mb-5">The question</h2>
        <p class="mb-5">St. Pete keeps getting called an up-and-coming tech hub, and the number I kept hearing was that local tech jobs are growing "3× the national rate." I wanted to know two things: what the Tampa Bay economy is actually built on, and whether that tech-hub story holds up in the wage and employment data. So I pulled the government's own occupation and labor-force numbers and looked.</p>
      </section>

      <section class="mb-16 md:mb-20">
        <h2 class="font-bold mb-5 max-w-3xl">The data</h2>
        <div class="max-w-3xl">
          <p class="mb-5">Two federal sources. BLS OEWS gives employment and wages for every occupation in the Tampa metro against the national numbers (2025). Census ACS gives labor-force status, education, and earnings down to St. Petersburg city, plus what residents do for work (2023 5-year).</p>
          <p class="mb-5">The one distinction the whole page rests on: OEWS counts jobs located in the metro (where the work is), and ACS counts people who live here (where the workers are). Those are different populations, so I keep them on separate charts and never subtract one from the other.</p>
          <p class="text-lg"><a class="link" href="#data-sources">See the sources and notebooks ↓</a></p>
        </div>
      </section>

      <section class="mb-16 md:mb-20">
        <h2 class="font-bold mb-5 max-w-3xl">What the data showed</h2>

        <h3 class="mb-3 max-w-3xl">It isn't a tech town</h3>
        <p class="max-w-3xl">The metro runs on 1,447,120 jobs. The biggest occupation groups are office and administrative support (185,560), sales (147,430), food service (138,090), business and finance (118,550), and management (113,290). Computer and mathematical work is 50,900 jobs, which puts it 12th of the 22 occupation groups, about the same size as production. It is a real part of the economy. It is not the center of it.</p>
        <figure class="figure">
          <div class="figure-frame"><img src="../assets/img/charts/labor-occupation-mix.png" alt="Horizontal bar chart of Tampa metro employment by occupation group; office/admin, sales, and food service lead; computer and mathematical is 12th of 22."></div>
          <figcaption class="figcaption">Employment by occupation group, Tampa metro (BLS OEWS 2025). Computer and math work is highlighted — mid-pack, not a leader.</figcaption>
        </figure>

        <h3 class="mb-3 mt-14 max-w-3xl">What it runs on is finance, legal, and service</h3>
        <p class="max-w-3xl">A location quotient measures how concentrated an occupation is here compared with the country. The metro's highest are legal (1.43×), business and finance (1.21×), and sales (1.18×). Tech comes in at 1.04×, which is national parity, and the BLS-published location quotient says the same 1.04. Local tech pay is $108,860, about 91% of the national tech wage. That is where the "3× the national rate" line runs out: on how concentrated tech is, and on what it pays, tech is an ordinary group here.</p>
        <figure class="figure">
          <div class="figure-frame"><img src="../assets/img/charts/labor-specialization-lq.png" alt="Location quotient by occupation group for the Tampa metro; legal 1.43, business and finance 1.21, sales 1.18 lead; computer and math sits at 1.04, near the 1.0 national-average line."></div>
          <figcaption class="figcaption">Location quotient vs. the U.S. (BLS OEWS 2025). Above 1.0 means more concentrated here than nationally. Tech sits right at the line.</figcaption>
        </figure>

        <h3 class="mb-3 mt-14 max-w-3xl">The pay runs from about $33k to $118k</h3>
        <p class="max-w-3xl">Sorted by median wage, the occupation groups run from a median near $33,000 at the low end to about $118,000 at the top, and the spread inside each group is wide — the bar shows the 10th to the 90th percentile. It is a service-and-office economy with a well-paid professional layer on top, and a long tail of lower-wage work under it.</p>
        <figure class="figure">
          <div class="figure-frame"><img src="../assets/img/charts/labor-wage-spread.png" alt="Range plot of annual wages by occupation group, 10th to 90th percentile with the median marked, sorted by median from about $33k to $118k."></div>
          <figcaption class="figcaption">Annual wage by group, 10th–90th percentile with the median marked (BLS OEWS 2025).</figcaption>
        </figure>

        <h3 class="mb-3 mt-14 max-w-3xl">Where people work isn't where they live</h3>
        <p class="max-w-3xl">Put the two datasets side by side and a gap opens up. In the metro, 42% of residents work in management, business, science, and arts jobs, but only 37% of the jobs located here are in that category. The metro hosts more service jobs (20%) than its residents fill (17%). St. Petersburg city itself skews higher: 41% of adults hold a bachelor's degree or more, against 34% metro-wide, and the city's median household income is $73,118. The read is a well-credentialed resident base plus commuting across the metro line, not an error in either dataset. It is the kind of thing you only see by holding the residence and workplace numbers next to each other.</p>
        <figure class="figure">
          <div class="figure-frame"><img src="../assets/img/charts/labor-residence-vs-workplace.png" alt="Paired horizontal bars comparing residence-based (ACS) and workplace-based (OEWS) occupation shares for the Tampa metro across five broad categories; residents hold more management/professional jobs than the metro hosts."></div>
          <figcaption class="figcaption">Residence (ACS) vs. workplace (OEWS) occupation mix, Tampa metro. Residents skew more professional than the local job base.</figcaption>
        </figure>
      </section>

      <section class="mb-16 md:mb-20 max-w-3xl">
        <h2 class="font-bold mb-5">How I built it</h2>
        <p class="mb-6">Every source went through the same pipeline. A Python script pulls it from the BLS or Census API into <strong>DuckDB</strong>; <strong>dbt</strong> models and tests turn the raw tables into the metrics above; a <strong>marimo</strong> notebook reconciles every number against the source; and a short written dossier records where a bug could hide. I ran the same steps on five sources now — the labor work was the fourth and fifth. It's the same repo as my St. Pete property-risk project, a different research thread. Building it once for flood data and running it again on labor data with no change to the method is the part I care about.</p>
        <ul class="flex flex-wrap gap-2 text-base">
          <li class="border border-faint rounded px-3 py-1">BLS OEWS</li>
          <li class="border border-faint rounded px-3 py-1">Census ACS</li>
          <li class="border border-faint rounded px-3 py-1">DuckDB</li>
          <li class="border border-faint rounded px-3 py-1">dbt</li>
          <li class="border border-faint rounded px-3 py-1">Python · pandas</li>
          <li class="border border-faint rounded px-3 py-1">marimo</li>
          <li class="border border-faint rounded px-3 py-1">matplotlib</li>
        </ul>
      </section>

      <section class="max-w-3xl">
        <h2 class="font-bold mb-5">What I learned</h2>
        <ul class="flex flex-col gap-4">
          <li class="flex gap-3"><span class="accent select-none" aria-hidden="true">—</span><span>OEWS is a point-in-time survey, not a time series. BLS says so directly, and the API only serves the current year. A "growing 3× the national rate" claim can't be sourced from it cleanly, which is worth knowing before you repeat it.</span></li>
          <li class="flex gap-3"><span class="accent select-none" aria-hidden="true">—</span><span>Residence and workplace are different questions. A metro wage and a resident's earnings measure different people, and the gap between them is a real finding once you stop treating them as the same number.</span></li>
          <li class="flex gap-3"><span class="accent select-none" aria-hidden="true">—</span><span>The pipeline I built for flood risk carried over to labor data with no changes. That was the test of whether it was a method or a one-off.</span></li>
          <li class="flex gap-3"><span class="accent select-none" aria-hidden="true">—</span><span>Checking the booster claim against the actual occupation data was the whole point, and it didn't hold. Tech is a mid-sized, average-paid group here, not a 3× standout.</span></li>
        </ul>
      </section>

      <section id="data-sources" class="mt-16 md:mt-20 pt-10 border-t border-faint-soft scroll-mt-20">
        <h2 class="font-bold mb-5 max-w-3xl">Data &amp; notebooks</h2>
        <p class="text-lg opacity-80 mb-6 max-w-3xl">Two federal sources, each run through the pipeline above.</p>
        <div class="overflow-x-auto mb-12">
          <table class="data-table">
            <thead>
              <tr><th>Source</th><th>Grain</th><th>Provider</th></tr>
            </thead>
            <tbody>
              <tr><td>Occupation employment &amp; wages</td><td>metro × occupation</td><td>BLS OEWS</td></tr>
              <tr><td>Labor force, education, earnings</td><td>city / county / metro</td><td>Census ACS 5-year</td></tr>
              <tr><td>Occupation by residence</td><td>geo × occupation</td><td>Census ACS 5-year</td></tr>
            </tbody>
          </table>
        </div>

        <h3 class="mt-4 mb-3 max-w-3xl">The notebooks</h3>
        <p class="text-lg opacity-80 mb-5 max-w-3xl">Static exports of the marimo notebooks behind the charts. Read-only snapshots; the interactive charts still respond.</p>
        <ul class="flex flex-col gap-3 text-lg max-w-3xl">
          <li><a class="link" href="../notebooks/tampa-labor/labor_force_profile.html" target="_blank" rel="noopener">Labor-force portrait — the full dashboard ↗</a></li>
          <li><a class="link" href="../notebooks/tampa-labor/oews_pipeline.html" target="_blank" rel="noopener">OEWS pipeline reconciliation ↗</a></li>
          <li><a class="link" href="../notebooks/tampa-labor/acs_labor_pipeline.html" target="_blank" rel="noopener">ACS pipeline reconciliation ↗</a></li>
        </ul>
      </section>

      <footer class="mt-16 pt-8 border-t border-faint-soft max-w-3xl">
        <a class="link text-lg" href="/#projects">← Back to all projects</a>
      </footer>
    </main>
```

- [ ] **Step 2: Verify the page renders locally**

Run: `cd /Users/beckpiscopo/Desktop/dev/portfolio-site && python3 -m http.server 8899 >/dev/null 2>&1 &` then open `http://localhost:8899/projects/tampa-labor.html` (or use the browser tool). Confirm: the page loads in the site layout, the four chart images resolve (the `labor-*.png` files exist from Task 1), the three notebook links resolve, light/dark toggle works, and the copy reads in the plain voice with no AI tells. Stop the server after (`kill %1`).

- [ ] **Step 3: Proofread against the voice rules**

Re-read the page copy once against the Global-Constraints voice rules. Confirm: no banned words, no "not just X but Y", no rule-of-three filler, headings sentence-case, bold only on numbers, straight quotes. Fix any slips inline.

- [ ] **Step 4: Commit the page + the generated artifacts (portfolio-site)**

```bash
cd /Users/beckpiscopo/Desktop/dev/portfolio-site
git add projects/tampa-labor.html assets/img/charts/labor-occupation-mix.png assets/img/charts/labor-specialization-lq.png assets/img/charts/labor-wage-spread.png assets/img/charts/labor-residence-vs-workplace.png notebooks/tampa-labor/labor_force_profile.html notebooks/tampa-labor/oews_pipeline.html notebooks/tampa-labor/acs_labor_pipeline.html
git commit -m "feat(site): Tampa Bay Labor-Market case-study page + charts + notebooks

$(printf 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01X4omLqZJ2rq5GzC3Jj2mXz')"
```

---

### Task 4: Homepage card + thumbnail + About line (portfolio-site)

**Repo:** `portfolio-site`, same branch.

**Files:**
- Modify: `index.html` (add project card + About bullet)
- Create: `assets/img/projects/tampa-labor.png` (thumbnail, copied from the occupation-mix chart)

- [ ] **Step 1: Create the thumbnail** (reuse the occupation-mix chart)

```bash
cd /Users/beckpiscopo/Desktop/dev/portfolio-site
cp assets/img/charts/labor-occupation-mix.png assets/img/projects/tampa-labor.png
```

- [ ] **Step 2: Add the project card to the `#projects` grid in `index.html`**

Immediately after the closing `</a>` of the existing St. Pete card (the `<a href="projects/st-pete.html" ...>...</a>` block that ends just before `</div>` closing the grid), insert:

```html
          <a href="projects/tampa-labor.html" class="group block p-0 no-underline rounded-lg border border-faint overflow-hidden transition-colors hover:border-current">
            <div class="project-thumb">
              <img src="assets/img/projects/tampa-labor.png" alt="Tampa Bay Labor-Market Analysis chart" loading="lazy" onerror="this.style.display='none'">
            </div>
            <div class="p-6">
              <h3 class="mb-2">Tampa Bay Labor-Market Analysis</h3>
              <p class="text-base opacity-80">What the Tampa Bay economy actually runs on, from BLS and Census data — a finance, legal, and service metro where tech is one mid-sized group, and where people work isn't where they live. Same DuckDB/dbt/marimo pipeline as the property project, a different question.</p>
              <span class="accent text-sm mt-3 inline-block">View case study →</span>
            </div>
          </a>
```

- [ ] **Step 3: Add one About bullet** — in the About list on `index.html` (the `<li>` items after "My portfolio consists of projects that I created because I needed them to exist:"), add after the St. Pete property bullet:

```html
          <li class="flex gap-3"><span class="accent select-none" aria-hidden="true">—</span><span>I ran the same open-data pipeline on the region's jobs numbers to see what the economy is built on — a <a class="link" href="#projects">Tampa Bay labor-market analysis</a>.</span></li>
```

- [ ] **Step 4: Verify the homepage**

Run the local server (as in Task 3 Step 2), open `http://localhost:8899/`, confirm: the new card appears in the projects grid with its thumbnail and links to the case study; the About bullet is present and links to `#projects`; light/dark both fine. Stop the server.

- [ ] **Step 5: Commit**

```bash
cd /Users/beckpiscopo/Desktop/dev/portfolio-site
git add index.html assets/img/projects/tampa-labor.png
git commit -m "feat(site): add Tampa Bay Labor-Market card + About line to homepage

$(printf 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01X4omLqZJ2rq5GzC3Jj2mXz')"
```

---

## Notes for the implementer

- **Two repos:** Tasks 1–2 edit and commit in `st_pete_analytics` (branch `feat/labor-portfolio-export`); Tasks 3–4 commit in `portfolio-site` (branch `feat/tampa-labor-case-study`). The generated PNGs and notebook HTML are produced by Tasks 1–2 but committed on the portfolio-site side in Tasks 3–4.
- **No new analysis.** Every number is from the shipped, verified pipeline; the page and charts only re-present it. If any chart number disagrees with the Global-Constraints values, stop — the data or query is wrong, don't adjust the copy to match.
- **Voice is a first-class requirement.** The page copy is reviewed for AI tells the same way code is reviewed for bugs. Match the property page's voice.
- **Marimo/DB lock:** if a `marimo edit` session is open on `analytics.db`, the read-only chart export and HTML export still work; only `dbt` needs a write lock (not used in this plan).
- **Deferred:** cross-linking the two case-study pages — left out until the user decides how.
```
