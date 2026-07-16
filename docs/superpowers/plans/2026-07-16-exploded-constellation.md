# Exploded Constellation (Scene 2 Figure) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Abstract scene's uniform-random "snow" scatter with an exploded diagram of the Fig. 1 constellation — clusters pushed apart radially, with faint ghost annotations marking where structure used to be.

**Architecture:** All figure changes live in `assets/js/figure-engine.js`: `assignDispersal()` gains explode geometry driven by the existing `clusters` array, a module-level `ghost` state object (pattern follows the existing `orbit` object) carries former centroids / exploded centers, and a formation-scoped draw pass renders dashed ghost circles, "+" ticks, and optional leader lines with its own eased visibility multiplier. Verification extends `scripts/verify-deck.mjs` via a new read-only `window.FigureEngine.getDebug()` getter.

**Tech Stack:** Vanilla JS canvas 2D (no dependencies), puppeteer-core + system Chrome for the verify suite.

**Spec:** `docs/superpowers/specs/2026-07-16-exploded-constellation-design.md`

## Global Constraints

- No new dependencies; vanilla JS only, matching figure-engine idiom (2-space indent, `const`/arrow style, section comments like `/* ---------- x ---------- */`).
- Formation name stays `dispersal`; `index.html` scene markup, `data-formation`, and caption text are untouched.
- `FORMS.dispersal` visibility profile unchanged: `edges: 0, hub: 0, alpha: 0.55, interactive: false`.
- Ghost ink follows the engine's theme convention: `inkA` prefix (`rgba(242,233,228,` dark / `rgba(62,31,20,` light).
- Verify suite expects a local server: `python3 -m http.server 8741` from repo root, then `node scripts/verify-deck.mjs`. All pre-existing checks must stay green (17/17 at last run).
- JS is cache-busted via `?v=` query on script tags in `index.html`; bump `figure-engine.js` to `?v=20260716a` in the final task.

---

### Task 1: Explode geometry + debug getter

**Files:**
- Modify: `assets/js/figure-engine.js` (lines ~146–151 `assignDispersal`, ~237 `window.FigureEngine`, ~265–271 `resize`)
- Test: `scripts/verify-deck.mjs` (new block before the final `browser.close()`)

**Interfaces:**
- Consumes: existing `clusters` array (objects `{x, y, spread, weight}` built by `layout()`), `clusterSample(c)`, `nodes` (`n.dust`, `n.hx`, `n.hy`), `W`, `H`, `PAD`.
- Produces:
  - Module-level `const ghost = { items: [], vis: 0, target: 0 }` where each item is `{x, y, r, ex, ey}` — former centroid (`x`,`y`), ghost circle radius `r`, exploded center (`ex`,`ey`). Task 2 renders from `ghost.items` and eases `ghost.vis` toward `ghost.target`.
  - `window.FigureEngine.getDebug()` returning `{ formation, ghostVis, ghostCenters: [{x,y}], explodedCenters: [{x,y}], homes: [{x,y}], size: {w, h} }` (`homes` = non-dust node homes; `ghostVis` is 0 until Task 2 wires easing, so expose `ghost.vis` now).

- [ ] **Step 1: Write the failing checks**

Append to `scripts/verify-deck.mjs`, immediately before `await browser.close();`:

```js
/* --- dispersal: exploded constellation geometry --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 960 });
  await page.goto(URL + '#abstract', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));
  const dbg = await page.evaluate(() => window.FigureEngine.getDebug());
  check('dispersal: formation active', dbg.formation === 'dispersal');
  check('dispersal: ghost centers present', dbg.ghostCenters.length >= 2, `got ${dbg.ghostCenters.length}`);
  check('dispersal: ghost centers in bounds',
    dbg.ghostCenters.every(g => g.x >= 0 && g.x <= dbg.size.w && g.y >= 0 && g.y <= dbg.size.h));
  // clustered, not uniform: mean distance from each non-dust home to its
  // nearest exploded center. Exploded gaussian spread tops out ~88px
  // (spread ≤40 × 2.2), so the mean sits well under 160; uniform scatter
  // on a 1728×960 canvas over ≤6 centers baselines at ~200+.
  let sum = 0;
  for (const h of dbg.homes) {
    let best = Infinity;
    for (const c of dbg.explodedCenters) best = Math.min(best, Math.hypot(h.x - c.x, h.y - c.y));
    sum += best;
  }
  const mean = sum / dbg.homes.length;
  check('dispersal: homes clustered (not uniform)', mean < 160, `mean=${mean.toFixed(1)}px`);
  await page.screenshot({ path: 'scripts/out/dispersal-exploded.png' });
  await page.close();
}
```

- [ ] **Step 2: Run suite to verify the new checks fail**

```bash
python3 -m http.server 8741 &   # from repo root, if not already running
node scripts/verify-deck.mjs
```

Expected: the 4 new `dispersal:` checks FAIL (`getDebug` is not a function → the `page.evaluate` throws; that counts — the suite must not pass). Pre-existing 17 checks PASS.

- [ ] **Step 3: Implement explode geometry**

In `assets/js/figure-engine.js`, add module-level state after the `orbit` declaration (line ~46):

```js
  const orbit = { cx: 0, cy: 0, rx: 0, ry: 0 };
  /* exploded-diagram apparatus: former centroids + where their clusters went */
  const ghost = { items: [], vis: 0, target: 0 };
```

Replace `assignDispersal` (lines 146–151):

```js
  function assignDispersal() {
    ghost.items = [];
    let cx = 0, cy = 0, wsum = 0;
    for (const c of clusters) { cx += c.x * c.weight; cy += c.y * c.weight; wsum += c.weight; }
    cx /= wsum; cy /= wsum;
    const M = Math.max(PAD + 26, Math.min(W, H) * 0.08);
    const exploded = clusters.map(c => {
      const dx = c.x - cx, dy = c.y - cy;
      const f = 1.6 + Math.random() * 0.3;
      const ex = Math.max(M, Math.min(W - M, cx + dx * f));
      const ey = Math.max(M, Math.min(H - M, cy + dy * f));
      ghost.items.push({ x: c.x, y: c.y, r: Math.max(18, c.spread * 2), ex, ey });
      return { x: ex, y: ey, spread: c.spread * 2.2 };
    });
    for (const n of nodes) {
      if (n.dust) {
        n.hx = PAD + Math.random() * (W - PAD * 2);
        n.hy = PAD + Math.random() * (H - PAD * 2);
        continue;
      }
      let bi = 0, bd = Infinity;
      for (let i = 0; i < clusters.length; i++) {
        const d = Math.hypot(clusters[i].x - n.hx, clusters[i].y - n.hy);
        if (d < bd) { bd = d; bi = i; }
      }
      const p = clusterSample(exploded[bi]);
      n.hx = p.x; n.hy = p.y;
    }
  }
```

Note: offsets are freshly sampled via `clusterSample` (spec requirement — scaling a node's previous offset breaks when arriving from the margins formation).

In `resize()`, the else-branch currently reads (lines ~265–266):

```js
    } else {
      FORMS[formation].assign();
```

Change to re-derive the composition before exploding (resize is a discontinuity per spec):

```js
    } else {
      if (formation === 'dispersal') layout();
      FORMS[formation].assign();
```

Replace the `window.FigureEngine` export (line 237):

```js
  window.FigureEngine = {
    setFormation,
    get formation() { return formation; },
    getDebug() {
      return {
        formation,
        ghostVis: ghost.vis,
        ghostCenters: ghost.items.map(g => ({ x: g.x, y: g.y })),
        explodedCenters: ghost.items.map(g => ({ x: g.ex, y: g.ey })),
        homes: nodes.filter(n => !n.dust).map(n => ({ x: n.hx, y: n.hy })),
        size: { w: W, h: H },
      };
    },
  };
```

- [ ] **Step 4: Run suite to verify the new checks pass**

```bash
node scripts/verify-deck.mjs
```

Expected: all checks PASS (17 pre-existing + 4 new = 21), `ALL CHECKS PASSED`, exit 0. Eyeball `scripts/out/dispersal-exploded.png`: distinct loose groups, no uniform snow (ghost marks not drawn yet — that's Task 2).

- [ ] **Step 5: Commit**

```bash
git add assets/js/figure-engine.js scripts/verify-deck.mjs
git commit -m "feat(figure): exploded-constellation geometry for dispersal formation"
```

---

### Task 2: Ghost annotations — easing, draw pass, leaders flag

**Files:**
- Modify: `assets/js/figure-engine.js` (`setFormation` ~lines 217–236, `frame()` eased-multipliers block ~line 309 and node draw pass ~line 443)
- Test: `scripts/verify-deck.mjs` (extend Task 1's dispersal block + new reduced-motion check)

**Interfaces:**
- Consumes: `ghost` object from Task 1 (`items: [{x, y, r, ex, ey}]`, `vis`, `target`); `inkA` string prefix and `stageAlpha` inside `frame()`; `REDUCED` flag.
- Produces: `ghost.vis` easing toward `ghost.target` at 0.02/frame (slower than edges' 0.05 so ghosts settle in after the morph, per spec); module-level `const GHOST_LEADERS = true` flag.

- [ ] **Step 1: Write the failing checks**

In `scripts/verify-deck.mjs`, inside the Task 1 dispersal block, after the clustering check and before the screenshot:

```js
  check('dispersal: ghosts eased in', dbg.ghostVis > 0.8, `vis=${dbg.ghostVis.toFixed(2)}`);
  // leave the formation: ghosts ease back out
  await page.keyboard.press('ArrowUp');
  await new Promise(r => setTimeout(r, 3000));
  const vis2 = await page.evaluate(() => window.FigureEngine.getDebug().ghostVis);
  check('dispersal: ghosts eased out on exit', vis2 < 0.15, `vis=${vis2.toFixed(2)}`);
```

And a new block after it, before `await browser.close();`:

```js
/* --- dispersal: reduced-motion ghost snap --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 960 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(URL + '#abstract', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));
  const vis = await page.evaluate(() => window.FigureEngine.getDebug().ghostVis);
  check('dispersal: reduced-motion ghost snap', vis === 1, `vis=${vis}`);
  await page.close();
}
```

Timing note: at 0.02/frame ease, `vis` passes 0.8 in ~80 frames (~1.4 s at 60fps); the existing 2500 ms settle is enough. The ease-out to <0.15 takes ~95 frames (~1.6 s); the 3000 ms wait is enough.

- [ ] **Step 2: Run suite to verify the new checks fail**

```bash
node scripts/verify-deck.mjs
```

Expected: `dispersal: ghosts eased in` FAILS (`vis=0.00` — nothing sets `ghost.target`), `dispersal: reduced-motion ghost snap` FAILS (`vis=0`). All others PASS.

- [ ] **Step 3: Implement easing, snap, and draw pass**

In `assets/js/figure-engine.js`, add the flag next to the `ghost` declaration:

```js
  const ghost = { items: [], vis: 0, target: 0 };
  const GHOST_LEADERS = true;   /* A/B: leader lines from ghost to exploded cluster */
```

In `setFormation`, after `stageAlphaTarget = f.alpha; interactive = f.interactive;` (line ~224):

```js
    ghost.target = name === 'dispersal' ? 1 : 0;
```

In the REDUCED branch of `setFormation`, extend the snap line:

```js
      edgeVis = f.edges; hubVis = f.hub; stageAlpha = f.alpha; ghost.vis = ghost.target;
```

In `frame()`, extend the eased-multipliers block (after `stageAlpha += ...`, line ~311):

```js
    ghost.vis += (ghost.target - ghost.vis) * 0.02;
```

In `frame()`, immediately after `const inkA = ...` (line ~443) and before the node loop, add the draw pass:

```js
    /* ghost apparatus — where structure used to be (dispersal only) */
    if (ghost.vis > 0.01 && ghost.items.length) {
      const ga = 0.27 * ghost.vis * stageAlpha;   /* ≈0.15 ink at rest (stageAlpha .55) */
      ctx.strokeStyle = inkA + ga.toFixed(3) + ')';
      ctx.lineWidth = 0.7;
      for (const g of ghost.items) {
        ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(g.x - 5, g.y); ctx.lineTo(g.x + 5, g.y);
        ctx.moveTo(g.x, g.y - 5); ctx.lineTo(g.x, g.y + 5);
        ctx.stroke();
        if (GHOST_LEADERS) {
          const dx = g.ex - g.x, dy = g.ey - g.y;
          const d = Math.hypot(dx, dy);
          if (d > g.r + 12) {
            ctx.setLineDash([1.5, 4]);
            ctx.beginPath();
            ctx.moveTo(g.x + (dx / d) * g.r, g.y + (dy / d) * g.r);
            ctx.lineTo(g.x + dx * 0.7, g.y + dy * 0.7);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }
```

- [ ] **Step 4: Run suite to verify all checks pass**

```bash
node scripts/verify-deck.mjs
```

Expected: all checks PASS (24 total), `ALL CHECKS PASSED`, exit 0. Eyeball `scripts/out/dispersal-exploded.png`: dashed circles + ticks visible where clusters were, leaders pointing outward, still reading as annotation rather than clutter.

- [ ] **Step 5: Commit**

```bash
git add assets/js/figure-engine.js scripts/verify-deck.mjs
git commit -m "feat(figure): ghost annotations for exploded dispersal — dashed centroids, ticks, leader flag"
```

---

### Task 3: Full verification, cache-bust, screenshots

**Files:**
- Modify: `index.html:229` (cache-buster)
- Test: full `scripts/verify-deck.mjs` run + manual morph pass

**Interfaces:**
- Consumes: everything from Tasks 1–2.
- Produces: shippable state; screenshots for review.

- [ ] **Step 1: Bump figure-engine cache-buster**

In `index.html` line 229, change:

```html
  <script src="assets/js/figure-engine.js?v=20260709b" defer></script>
```

to:

```html
  <script src="assets/js/figure-engine.js?v=20260716a" defer></script>
```

(Leave `scenes.js` and `output.css` busters alone — they didn't change.)

- [ ] **Step 2: Full suite run**

```bash
node scripts/verify-deck.mjs
```

Expected: all 24 checks PASS, exit 0.

- [ ] **Step 3: Manual morph pass (live browser)**

With the server still on :8741, open `http://localhost:8741/index.html` in a real browser and verify, in both themes (toggle `◐`):

1. Scene 1 → 2 (wheel/ArrowDown): the constellation visibly comes apart; groups remain legible; ghosts fade in after the morph settles.
2. Scene 3 → 2 (ArrowUp from work): nodes leave the margins and form the same exploded groups; no edge pile-up.
3. Reduced motion (OS setting or DevTools emulation): scene 2 renders the exploded layout + ghosts in a single painted frame.
4. Taste call on `GHOST_LEADERS`: if leaders read as busy, set the flag to `false`, re-run the suite, and note the decision in the commit message.

Capture screenshots for the record (headless is fine):

```bash
node -e "
import('puppeteer-core').then(async ({ default: p }) => {
  const b = await p.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1728, height: 960 });
  await pg.goto('http://localhost:8741/index.html#abstract', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3500));
  await pg.screenshot({ path: 'scripts/out/manual-dispersal-light.png' });
  await pg.click('#theme-toggle-btn');
  await new Promise(r => setTimeout(r, 700));
  await pg.screenshot({ path: 'scripts/out/manual-dispersal-dark.png' });
  await b.close();
});"
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "chore(figure): cache-bust figure-engine for exploded dispersal"
```

---

## Self-Review Notes

- **Spec coverage:** explode geometry (Task 1 steps 3), resample-not-scale offsets (Task 1 step 3 note), resize re-layout (Task 1 step 3), ghost circles/ticks/leaders + flag (Task 2 step 3), ghost easing at 0.02 + reduced-motion snap (Task 2 step 3), unchanged FORMS profile/markup/caption (no task touches them), debug getter + clustered-not-uniform + ghost-bounds checks (Task 1 step 1), suite stays green (every task's run step), manual both-themes pass + leaders taste call (Task 3 step 3). No gaps found.
- **Threshold derivation (spec deferred to implementation):** exploded cluster gaussian spread ≤ 40 × 2.2 = 88 px; mean |gauss| ≈ 0.8 × spread with the 25% wide-tail in `clusterSample`, so expected mean nearest-center distance ≈ 70–110 px. Uniform baseline on 1728×960 over ≤ 6 centers ≈ 0.38·√(A/6) ≈ 200 px. Threshold 160 px splits the distributions with margin on both sides.
- **Type consistency:** `ghost.items` shape `{x, y, r, ex, ey}` is identical in Task 1 (producer) and Task 2 (renderer); `getDebug()` field names match between engine (Task 1) and suite checks (Tasks 1–2).
