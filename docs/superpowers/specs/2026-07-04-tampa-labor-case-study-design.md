# Tampa Bay Labor-Market Analysis — Portfolio Case Study Design

**Date:** 2026-07-04
**Status:** Design
**Repo:** portfolio-site (the beckpiscopo.xyz source)

## Goal

Add a second St. Pete/Tampa Bay case study to the portfolio: a labor-market analysis built from
BLS OEWS and Census ACS data. It runs alongside the existing property-risk page as a distinct
project — different question, different data, same repo and same verify-first method. The page
does two jobs at once: it tells what the metro's economy actually is, and it shows the repeatable
pipeline that produced the answer.

## Context

The site is a Tailwind static site. Project case studies live in `projects/*.html` and are listed
as cards in the `#projects` grid on `index.html`. The existing `projects/st-pete.html` (the
property-risk analysis) is the template: a sidebar layout, a hero with a metadata block and a repo
link, then sections — the question, the data, what the data showed (findings, each with a static
PNG chart and a caption), how I built it, what I learned, and a data-and-metrics appendix that
links out to marimo notebooks exported as static HTML.

Two mechanics carry over:
- Charts are static PNGs in `assets/img/charts/`, generated from the real analysis by
  `st_pete_analytics/scripts/export_portfolio_charts.py` so the numbers match the notebooks.
- Notebooks are static HTML exports under `notebooks/st-pete/`, linked from the appendix.

The labor analysis already shipped in the `st-pete-housing-analytics` repo (the same repo the
property page links): the OEWS occupational portrait and the ACS residence/city layer, with five
verified pipeline dossiers and a marimo dashboard. This page is the portfolio front-end for that
work; it does no new analysis.

## Page identity

- **Title:** Tampa Bay Labor-Market Analysis. (The occupation data is metro-level, so "Tampa Bay"
  is the honest geography; it also reads as a different project from "St. Pete Property-Risk
  Analysis" on the grid rather than a second flood page.)
- **URL:** `projects/tampa-labor.html`.
- **Subtitle (lead):** What the Tampa Bay economy runs on, and why where people work isn't where
  they live.
- **Thesis:** Tampa Bay is a finance, legal, and service economy, not a tech town — and the
  resident workforce doesn't match the local job base. The booster line that tech grows "3× the
  national rate" is a supporting correction, not the headline.
- **Metadata block:** Role = Solo (data pipeline, analysis, write-up); Timeline = Personal project
  · 2026; Stack = BLS OEWS · Census ACS · DuckDB · dbt · marimo. Repo link → the same
  `st-pete-housing-analytics` repo.

## Page structure

Same section order as `projects/st-pete.html`.

1. **The question** — I wanted to know what the Tampa Bay economy is actually built on, and
   whether the local "we're becoming a tech hub" story holds up in the wage data. State the
   booster "3×" line here as the thing to check, plainly.
2. **The data** — BLS OEWS (occupation employment and wages, Tampa metro vs U.S., 2025) and Census
   ACS 5-year (labor-force status, education, earnings, and occupation by residence, for St.
   Petersburg city, Pinellas County, and the metro). Note the one distinction the whole page rests
   on: OEWS counts jobs located here (workplace); ACS counts people who live here (residence).
3. **What the data showed** — four findings, each a short paragraph plus one static PNG chart:

   | # | Finding | Chart (PNG) |
   |---|---|---|
   | 1 | Not a tech town. The biggest occupation groups are office and administrative support (185,560), sales (147,430), food service (138,090), business and finance (118,550), management (113,290). Computer and math work is 50,900 jobs — 12th of 22 groups, about the size of production. | `labor-occupation-mix.png` — employment by occupation group, horizontal bar, tech bar highlighted |
   | 2 | What it runs on: finance, legal, service. By location quotient (how concentrated an occupation is here vs. nationally) the metro over-indexes on legal (1.43×), business and finance (1.21×), and sales (1.18×). Tech sits at 1.04× — national parity — and BLS's own published location quotient says the same 1.04. Local tech pay is $108,860, about 91% of the national tech wage. That is where the "3× the national rate" claim runs out: on concentration and on pay, tech is an ordinary group here, not a standout. | `labor-specialization-lq.png` — location quotient ranked bar, reference line at 1.0 |
   | 3 | The pay hierarchy. Annual wages by group, from the 10th to the 90th percentile: the median group runs from about $33,000 at the low end to about $118,000 at the top, and the within-group spread is wide. | `labor-wage-spread.png` — 10th–90th percentile range plot, median marked, sorted by median |
   | 4 | Where people work isn't where they live. In the metro, 42% of *residents* work in management, business, science, and arts jobs, but only 37% of the *jobs located here* are in that category; the metro hosts more service jobs (20%) than its residents fill (17%). St. Petersburg city residents are more educated (41% hold a bachelor's or higher) and higher-earning ($73,118 median household income) than the county or the metro. The gap is commuting and a well-credentialed resident base, read across the two datasets — not an error. | `labor-residence-vs-workplace.png` — residence (ACS) vs workplace (OEWS) occupation share, paired horizontal bar |

4. **How I built it** — lead with the method, since that is the transferable part. Each source
   went through the same pipeline: a Python script pulls it from the BLS or Census API into DuckDB,
   dbt models and tests turn it into the metrics above, a marimo notebook reconciles every number
   against the source, and a short dossier documents where a bug could hide. Five sources have gone
   through it now; the labor work was the fourth and fifth. Same repo as the property project, a
   different research thread. Tech pills: BLS OEWS · Census ACS · DuckDB · dbt · Python · pandas ·
   marimo · matplotlib.
5. **What I learned** — a short bulleted list, e.g.: OEWS is a point-in-time survey, not a time
   series, so a "growth rate" claim can't be sourced from it cleanly; the residence-vs-workplace
   split changes what a wage number means; the pipeline that I built for flood risk carried over to
   labor data with no changes to the method; and checking the booster claim against the actual
   occupation data was the whole point — it did not hold.
6. **Data & metrics** — a source table (BLS OEWS, Census ACS 5-year, with grain and provider) and
   links to the three labor marimo notebooks exported as static HTML.

## Voice and prose rules

The page copy is written in the first person, past tense, in the plain and specific voice of the
existing `projects/st-pete.html`. Applied rules, drawn from the Wikipedia "Signs of AI writing"
checklist:

- No AI-vocabulary words: delve, showcase, leverage, robust, crucial, pivotal, tapestry, testament,
  underscore, landscape, vibrant, boasts, seamless, intricate, foster, garner, realm, navigate,
  bolster, myriad, nuanced.
- No negative parallelisms ("not just X, but Y"; "it's not X, it's Y") and no rule-of-three filler.
- No hollow present-participle tails ("highlighting the importance of…", "reflecting a broader
  shift") and no inflated-significance statements ("stands as a testament", "underscores").
- Plain verbs — keep "is/are"; do not inflate to "serves as" or "represents".
- Restrained formatting: sentence-case headings, bold only on real numbers, straight quotes,
  em-dashes used sparingly (kept at or below the property page's level).
- Concrete over grand: specific numbers, honest caveats stated flat, no press-release tone.

Every number on the page comes from the analysis and matches the notebooks.

## Production pieces

1. **Chart export.** Extend `st_pete_analytics/scripts/export_portfolio_charts.py` with four
   functions that render the labor charts to `portfolio-site/assets/img/charts/`
   (`labor-occupation-mix.png`, `labor-specialization-lq.png`, `labor-wage-spread.png`,
   `labor-residence-vs-workplace.png`). Data is read live from `analytics.db` (read-only) so the
   figures match the dashboard. Match the existing charts' size, fonts, and color usage.
2. **Notebook exports.** Export the three labor marimo notebooks
   (`analysis/labor_force_profile.py`, `analysis/pipelines/oews_pipeline.py`,
   `analysis/pipelines/acs_labor_pipeline.py`) to static HTML under
   `portfolio-site/notebooks/tampa-labor/`.
3. **The page.** `projects/tampa-labor.html`, copied from `projects/st-pete.html` and rewritten:
   the head/sidebar/toggle/scripts stay identical; the hero, sections, findings, and appendix are
   replaced with the labor content above.
4. **Homepage.** Add a project card to the `#projects` grid in `index.html` linking to
   `projects/tampa-labor.html`, with a thumbnail at `assets/img/projects/tampa-labor.png` (the
   occupation-mix chart, or a dashboard screenshot). Add one line to the About bullets that
   mentions the labor analysis.

## Out of scope

- No new analysis or data ingestion; the numbers are already computed and verified.
- No change to the shared site chrome (sidebar, dark toggle, fonts, `dist/output.css`) beyond the
  new card and page.
- No interactive/embedded dashboard on the page; static PNGs plus links to the static-HTML
  notebooks, matching the property page.
- The property page is left as-is (no retrofit to cross-link, unless added as a small follow-up).

## Success criteria

- `projects/tampa-labor.html` renders in the site's layout, light and dark, with the four findings
  and their charts, and reads in Beck's voice with none of the AI tells listed above.
- The four chart PNGs are generated by the export script and their numbers match the notebooks and
  the dossiers (occupation-mix top groups, LQ 1.04 tech / 1.43 legal, wage span, residence 42% vs
  workplace 37%).
- The three notebooks are linked and open as static HTML.
- The homepage grid shows the new card; the About section mentions it.
- Every figure on the page is traceable to the analysis; nothing is invented for the page.
