# Scene Deck Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the homepage into a fixed-viewport six-scene deck over one persistent, morphing particle canvas, per `docs/superpowers/specs/2026-07-09-scene-deck-design.md`.

**Architecture:** A vanilla-JS deck controller (`scenes.js`) stacks the existing `<section>`s in a fixed stage and advances between them on wheel/touch/keys/hash/arrows with a transition lock. The particle sim (`figure-engine.js`, evolved from `fig1-graph.js`) exposes named formations; scene changes retarget node homes and the existing spring physics performs the morph. Below 901px or without JS, the page renders as today's stacked scrolling document.

**Tech Stack:** Vanilla JS (no new runtime deps), Tailwind/PostCSS build (`npm run build-css`), `puppeteer-core` (devDependency) + system Chrome for verification.

## Global Constraints

- No new runtime dependencies; all deck/engine code is vanilla JS.
- All section content stays in the DOM in source order at load (SEO/a11y/mobile parity).
- Existing section IDs keep working as deep links: `#abstract`, `#work`, `#activity`, `#writing`, `#contact`.
- Mobile (≤900px) and no-JS render the stacked scrolling layout; the deck never boots there.
- `prefers-reduced-motion`: deck navigates with instant cuts; formations apply as static states.
- Design tokens only (`--accent`, `--accent-rgb`, `--color-background`, `--doc-ink`, `--plate-abstract`, hairlines); no new hex values in CSS.
- Cache-bust every changed script/stylesheet reference with `?v=20260709b`.
- After any `src/document.css` change: `npm run build-css` before verifying.
- Verification harness note: headless Chrome's `--virtual-time-budget` does NOT drive `requestAnimationFrame` — always verify canvas behavior with the live puppeteer harness, never with `--screenshot`.
- One deviation from the spec, agreed during planning: scene 06 keeps its colophon as the bottom row *inside* the section; the caption strip on scene 06 shows the Fig. 6 caption + arrows as usual. (Spec said colophon text replaces strip text; keeping the colophon in-scene is simpler and visually equivalent — both end up stacked at the bottom.)

## File Structure

- **Create** `assets/js/figure-engine.js` — particle stage: node pool, physics, intro choreography, six formations, `window.FigureEngine.setFormation(name)`.
- **Create** `assets/js/scenes.js` — deck controller: boot guard, scene stacking, `go(n)`, inputs, chrome sync (counter/caption strip/hash/aria/focus), engine wiring.
- **Create** `assets/js/plates.js` — Work scene index→preview swap (hover/focus). Works with or without the deck.
- **Create** `scripts/verify-deck.mjs` — puppeteer verification suite (screenshots + DOM assertions).
- **Modify** `index.html` — restructure into `#stage` + `.scene` sections, hero full-bleed text block, deck caption strip, table of plates, retire fig8-orbit.
- **Modify** `src/document.css` — baseline (no-deck) styles for new markup + `html.deck-on` deck styles.
- **Delete** `assets/js/fig1-graph.js`, `assets/js/fig8-orbit.js` (superseded).
- **Modify** `package.json` — add `puppeteer-core` devDependency.

---

### Task 1: Figure engine with formations

**Files:**
- Create: `assets/js/figure-engine.js`
- Modify: `index.html` (script tag swap)
- Delete: `assets/js/fig1-graph.js`

**Interfaces:**
- Consumes: `<canvas id="net">` (already in DOM), CSS custom properties `--accent-rgb`, `--accent`, `--color-background`, root `.dark` class, and (from Task 2 on) `#stage[data-plate]`.
- Produces: `window.FigureEngine = { setFormation(name: string): void, formation: string (getter) }` where `name ∈ {'constellation','dispersal','margins','grid','rows','orbit'}`. Safe to call before/after intro completes; no-op for unknown or current formation.

- [ ] **Step 1: Write `assets/js/figure-engine.js`**

Port of `fig1-graph.js` with: formation API, intro handoff (`introOver`), eased `edgeVis`/`hubVis`/`stageAlpha` multipliers, spring-heat morphs, dark-plate ink awareness, constellation keep-out zone over the hero text block, and orbit drift.

```js
// Figure engine — persistent particle stage for the scene deck.
// Evolved from fig1-graph.js: same node pool, spring physics, and
// constellation choreography (chaos → gather → ignite), plus named
// formations. window.FigureEngine.setFormation(name) retargets every
// node's home and the springs perform the morph.
(function () {
  const canvas = document.getElementById('net');
  if (!canvas) return;
  const rootEl = document.documentElement;
  const stageEl = () => document.getElementById('stage');
  const plateDark = () => (stageEl() && stageEl().dataset.plate === 'dark');
  const isDark = () => rootEl.classList.contains('dark') || plateDark();
  const css = () => getComputedStyle(rootEl);
  const accRGB = () => css().getPropertyValue('--accent-rgb').trim();
  const accHex = () => css().getPropertyValue('--accent').trim();
  const bgHex = () => css().getPropertyValue('--color-background').trim();

  const wrap = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W, H, nodes = [], clusters = [];

  const BASE_N = 380;
  const MAX_N = 460;
  const LINK = 74;
  const GATHER_R = 190;
  const PAD = 14;
  const REPEL = 13;
  const DUST = 0.16;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INTRO = !REDUCED;
  const EDGE_IN = 500, EDGE_RAMP = 1500, IGNITE = 2400;
  let t0 = null;
  let introOver = false;
  const smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;

  /* ---------- formation state ---------- */
  let formation = 'constellation';
  let edgeVis = 1, edgeTarget = 1;       /* eased 0..1 multipliers */
  let hubVis = 1, hubTarget = 1;
  let stageAlpha = 1, stageAlphaTarget = 1;
  let interactive = true;
  let heatUntil = -1;
  const orbit = { cx: 0, cy: 0, rx: 0, ry: 0 };

  const mouse = { x: -9999, y: -9999, active: false };
  wrap.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
  });
  wrap.addEventListener('pointerleave', () => { mouse.active = false; mouse.x = -9999; mouse.y = -9999; });
  wrap.addEventListener('pointerdown', e => {
    if (!interactive) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    for (let k = 0; k < 6; k++) {
      if (nodes.length >= MAX_N) cull();
      const a = Math.random() * Math.PI * 2, rr = Math.random() * 18;
      nodes.push(makeNode(x + Math.cos(a) * rr, y + Math.sin(a) * rr, true));
    }
  });

  function makeNode(x, y, fresh) {
    return {
      x, y, hx: x, hy: y, vx: 0, vy: 0,
      r: 1.1 + Math.random() * 1.5,
      born: fresh ? performance.now() : 0,
      dust: false, anchor: false, th: 0, orad: 1,
    };
  }

  function cull() {
    const idx = nodes[0] === hubNode ? 1 : 0;
    nodes.splice(idx, 1);
  }

  function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* keep-out zone: hero text block, bottom-left */
  const inTextZone = (x, y) => x < W * 0.6 && y > H * 0.52;

  /* deliberate composition: protagonist at a golden point clear of the
     text zone, supporting clusters kept apart inside a margin */
  function layout() {
    clusters = [];
    const m = Math.min(W, H);
    const M = Math.max(PAD + 26, m * 0.13);
    const SEP = m * 0.3;
    const g = Math.random() < 0.5 ? [0.618, 0.36] : [0.42, 0.3];
    clusters.push({
      x: g[0] * W + (Math.random() - 0.5) * m * 0.05,
      y: g[1] * H + (Math.random() - 0.5) * m * 0.05,
      spread: 20, weight: 1,
    });
    let guard = 0;
    while (clusters.length < 6 && guard++ < 500) {
      const c = {
        x: M + Math.random() * (W - 2 * M),
        y: M + Math.random() * (H - 2 * M),
        spread: 14 + Math.random() * 26,
        weight: 0.2 + Math.pow(Math.random(), 1.5) * 0.45,
      };
      if (inTextZone(c.x, c.y)) continue;
      if (clusters.every(o => Math.hypot(o.x - c.x, o.y - c.y) > SEP)) clusters.push(c);
    }
  }

  function clusterSample(c) {
    const s = Math.random() < 0.75 ? c.spread : c.spread * 2.6;
    return {
      x: Math.max(PAD, Math.min(W - PAD, c.x + gauss() * s)),
      y: Math.max(PAD, Math.min(H - PAD, c.y + gauss() * s)),
    };
  }

  function weightedCluster() {
    let sum = 0;
    for (const c of clusters) sum += c.weight;
    let r = Math.random() * sum;
    for (const c of clusters) { r -= c.weight; if (r <= 0) return c; }
    return clusters[0];
  }

  /* ---------- formation home assignments ---------- */
  function assignConstellation() {
    layout();
    for (const n of nodes) {
      if (n.dust) {
        n.hx = PAD + Math.random() * (W - PAD * 2);
        n.hy = PAD + Math.random() * (H - PAD * 2);
      } else {
        const p = clusterSample(weightedCluster());
        n.hx = p.x; n.hy = p.y;
      }
    }
  }

  function assignDispersal() {
    for (const n of nodes) {
      n.hx = PAD + Math.random() * (W - PAD * 2);
      n.hy = PAD + Math.random() * (H - PAD * 2);
    }
  }

  function assignMargins() {
    const B = Math.min(W, H) * 0.09;
    for (const n of nodes) {
      const side = (Math.random() * 4) | 0;
      const d = PAD + Math.random() * B;
      if (side === 0) { n.hx = Math.random() * W; n.hy = d; }
      else if (side === 1) { n.hx = Math.random() * W; n.hy = H - d; }
      else if (side === 2) { n.hx = d; n.hy = Math.random() * H; }
      else { n.hx = W - d; n.hy = Math.random() * H; }
    }
  }

  function assignGrid() {
    const pitch = 46;
    const cols = Math.max(4, Math.floor((W * 0.7) / pitch));
    const rows = Math.max(3, Math.floor((H * 0.55) / pitch));
    const ox = (W - (cols - 1) * pitch) / 2;
    const oy = H * 0.16;
    nodes.forEach((n, i) => {
      if (Math.random() < 0.3) {
        n.hx = PAD + Math.random() * (W - PAD * 2);
        n.hy = PAD + Math.random() * (H - PAD * 2);
        return;
      }
      const c = i % cols, r = ((i / cols) | 0) % rows;
      n.hx = ox + c * pitch + (Math.random() - 0.5) * 3;
      n.hy = oy + r * pitch + (Math.random() - 0.5) * 3;
    });
  }

  function assignRows() {
    const LINES = 5;
    nodes.forEach((n) => {
      if (Math.random() < 0.2) {
        n.hx = PAD + Math.random() * (W - PAD * 2);
        n.hy = PAD + Math.random() * (H - PAD * 2);
        return;
      }
      const li = (Math.random() * LINES) | 0;
      n.hx = W * 0.08 + Math.random() * W * 0.84;
      n.hy = H * (0.22 + 0.13 * li) + (Math.random() - 0.5) * 4;
    });
  }

  function assignOrbit() {
    orbit.cx = W * 0.6; orbit.cy = H * 0.46;
    orbit.rx = Math.min(W, H) * 0.32; orbit.ry = Math.min(W, H) * 0.2;
    for (const n of nodes) {
      n.th = Math.random() * Math.PI * 2;
      n.orad = Math.random() < 0.85 ? 0.96 + Math.random() * 0.08 : 0.5 + Math.random() * 1.1;
      n.hx = orbit.cx + Math.cos(n.th) * orbit.rx * n.orad;
      n.hy = orbit.cy + Math.sin(n.th) * orbit.ry * n.orad;
    }
  }

  const FORMS = {
    constellation: { edges: 1, hub: 1, alpha: 1,    interactive: true,  assign: assignConstellation },
    dispersal:     { edges: 0, hub: 0, alpha: 0.55, interactive: false, assign: assignDispersal },
    margins:       { edges: 0, hub: 0, alpha: 0.5,  interactive: false, assign: assignMargins },
    grid:          { edges: 0, hub: 0, alpha: 0.55, interactive: false, assign: assignGrid },
    rows:          { edges: 0, hub: 0, alpha: 0.55, interactive: false, assign: assignRows },
    orbit:         { edges: 0, hub: 0, alpha: 0.9,  interactive: false, assign: assignOrbit },
  };

  function setFormation(name) {
    const f = FORMS[name];
    if (!f || name === formation) return;
    formation = name;
    introOver = true;
    f.assign();
    edgeTarget = f.edges; hubTarget = f.hub;
    stageAlphaTarget = f.alpha; interactive = f.interactive;
    if (REDUCED) {
      for (const n of nodes) { n.x = n.hx; n.y = n.hy; n.vx = 0; n.vy = 0; }
      edgeVis = f.edges; hubVis = f.hub; stageAlpha = f.alpha;
      requestAnimationFrame(frame);
    } else {
      heatUntil = performance.now() + 900;
      for (const n of nodes) {
        n.vx += (Math.random() - 0.5) * 2.2;
        n.vy += (Math.random() - 0.5) * 2.2;
      }
    }
  }
  window.FigureEngine = { setFormation, get formation() { return formation; } };

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!nodes.length) {
      layout();
      for (let i = 0; i < BASE_N; i++) {
        if (Math.random() < DUST) {
          const n = makeNode(PAD + Math.random() * (W - PAD * 2), PAD + Math.random() * (H - PAD * 2), false);
          n.dust = true;
          nodes.push(n);
          continue;
        }
        const p = clusterSample(weightedCluster());
        const n = makeNode(p.x, p.y, false);
        if (Math.random() < 0.08) { n.r += 1.7; n.anchor = true; }
        nodes.push(n);
      }
      if (INTRO) {
        for (const n of nodes) {
          n.x = PAD + Math.random() * (W - PAD * 2);
          n.y = PAD + Math.random() * (H - PAD * 2);
          n.vx = (Math.random() - 0.5) * 3;
          n.vy = (Math.random() - 0.5) * 3;
        }
      }
    } else {
      FORMS[formation].assign();
    }
  }

  function buildGrid(cell) {
    const grid = new Map();
    for (let i = 0; i < nodes.length; i++) {
      const key = ((nodes[i].x / cell) | 0) + ':' + ((nodes[i].y / cell) | 0);
      let b = grid.get(key);
      if (!b) { b = []; grid.set(key, b); }
      b.push(i);
    }
    return grid;
  }
  function* neighbors(grid, cell, x, y) {
    const gx = (x / cell) | 0, gy = (y / cell) | 0;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const b = grid.get((gx + ox) + ':' + (gy + oy));
        if (b) yield* b;
      }
    }
  }

  let hubNode = null, hubSwitch = 0, switchPulse = -1;
  const mk = { x: 0, y: 0 };
  let nextBirth = 0;

  function frame(now) {
    const dark = isDark();

    if (t0 === null) t0 = now;
    const t = (INTRO && !introOver) ? now - t0 : 1e9;
    if (t !== 1e9 && t > IGNITE + 1500) introOver = true;
    const edgeFade = smooth((t - EDGE_IN) / EDGE_RAMP);
    const ig = smooth((t - IGNITE) / 600);
    const beat = 1 - 0.5 * Math.sin(Math.PI * clamp01((t - IGNITE) / 900));

    /* eased formation multipliers */
    edgeVis += (edgeTarget - edgeVis) * 0.05;
    hubVis += (hubTarget - hubVis) * 0.05;
    stageAlpha += (stageAlphaTarget - stageAlpha) * 0.05;
    const E = edgeFade * edgeVis;          /* effective edge visibility */
    const HV = ig * hubVis;                /* effective hub visibility */

    /* spring: intro temperature ramp × post-switch morph heat */
    let K = 0.0016 * (0.35 + 2.45 * smooth((t - 250) / 1350) - 1.8 * smooth((t - 1900) / 1000));
    if (heatUntil > now) K *= 1 + 2.2 * ((heatUntil - now) / 900);

    /* comet trails only during the intro gather */
    const trail = (INTRO && !introOver) ? 0.24 + 0.76 * smooth((t - IGNITE) / 900) : 1;
    if (trail >= 1) {
      ctx.clearRect(0, 0, W, H);
    } else {
      ctx.globalAlpha = trail;
      ctx.fillStyle = bgHex() || (dark ? '#1B0C05' : '#F2E9E4');
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    const grid = buildGrid(LINK);

    for (const n of nodes) {
      if (formation === 'orbit' && !REDUCED) {
        n.th += 0.0012;
        n.hx = orbit.cx + Math.cos(n.th) * orbit.rx * n.orad;
        n.hy = orbit.cy + Math.sin(n.th) * orbit.ry * n.orad;
      }
      n.vx += (n.hx - n.x) * K;
      n.vy += (n.hy - n.y) * K;
      if (formation === 'constellation') {
        n.hx += Math.sin(now * 0.00012 + n.hy * 0.13) * 0.04;
        n.hy += Math.cos(now * 0.00010 + n.hx * 0.11) * 0.04;
        n.hx = Math.max(PAD, Math.min(W - PAD, n.hx));
        n.hy = Math.max(PAD, Math.min(H - PAD, n.hy));
      }
      if (mouse.active && interactive) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < GATHER_R && d > 1) {
          const f = (1 - d / GATHER_R) * 0.055;
          n.vx += (dx / d) * f * d * 0.05;
          n.vy += (dy / d) * f * d * 0.05;
        }
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      for (const j of neighbors(grid, LINK, n.x, n.y)) {
        if (j <= i) continue;
        const m = nodes[j];
        const dx = n.x - m.x, dy = n.y - m.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL * REPEL && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / REPEL) * 0.05;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          n.vx += fx; n.vy += fy;
          m.vx -= fx; m.vy -= fy;
        }
      }
    }
    for (const n of nodes) {
      n.vx *= 0.9; n.vy *= 0.9;
      n.x += n.vx; n.y += n.vy;
    }

    const EDGE_BUDGET = 9;
    const deg = new Array(nodes.length).fill(0);
    if (E > 0.01) {
      ctx.lineWidth = 0.6;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (deg[i] >= EDGE_BUDGET) continue;
        for (const j of neighbors(grid, LINK, a.x, a.y)) {
          if (j <= i) continue;
          if (deg[i] >= EDGE_BUDGET) break;
          if (deg[j] >= EDGE_BUDGET) continue;
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            deg[i]++; deg[j]++;
            const dim = (a.dust || b.dust) ? 0.45 : 1;
            const alpha = (1 - d / LINK) * 0.3 * E * beat * dim * stageAlpha;
            ctx.strokeStyle = dark ? `rgba(242,233,228,${alpha.toFixed(3)})` : `rgba(62,31,20,${alpha.toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
    }

    let hi = -1;
    if (HV > 0.01) {
      const R = LINK * 0.8, R2 = R * R;
      const density = (i) => {
        const n = nodes[i];
        let c = 0;
        for (const j of neighbors(grid, LINK, n.x, n.y)) {
          if (j === i) continue;
          const m = nodes[j];
          const dx = n.x - m.x, dy = n.y - m.y;
          if (dx * dx + dy * dy < R2) c++;
        }
        return c;
      };
      let best = 0, bestC = -1;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].dust) continue;
        const c = density(i);
        if (c > bestC) { bestC = c; best = i; }
      }
      hi = hubNode ? nodes.indexOf(hubNode) : -1;
      if (hi < 0) {
        hubNode = nodes[best]; hi = best; hubSwitch = now;
        mk.x = hubNode.x; mk.y = hubNode.y;
      } else if (best !== hi && bestC > density(hi) + 3 && now - hubSwitch > 4000) {
        hubNode = nodes[best]; hi = best; hubSwitch = now; switchPulse = now;
      }
      mk.x += (hubNode.x - mk.x) * 0.08;
      mk.y += (hubNode.y - mk.y) * 0.08;

      ctx.lineWidth = 0.9;
      for (const j of neighbors(grid, LINK, hubNode.x, hubNode.y)) {
        if (j === hi) continue;
        const b = nodes[j];
        const d = Math.hypot(hubNode.x - b.x, hubNode.y - b.y);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(${accRGB()},${(1 - d / LINK) * (dark ? 0.95 : 0.85) * HV})`;
          ctx.beginPath(); ctx.moveTo(hubNode.x, hubNode.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }

    const inkA = dark ? 'rgba(242,233,228,' : 'rgba(62,31,20,';
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      let r = i === hi ? n.r + 1.8 * HV : n.r;
      if (n.born) {
        const age = (now - n.born) / 600;
        if (age < 1) r *= 0.3 + age * 0.7;
      }
      const a = (n.dust ? 0.38 : 0.82) * stageAlpha;
      ctx.fillStyle = (i === hi && HV > 0.5) ? accHex() : inkA + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
      if (n.anchor && E > 0.01) {
        ctx.strokeStyle = inkA + (0.35 * E * stageAlpha).toFixed(3) + ')';
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 3, 0, Math.PI * 2); ctx.stroke();
      }
    }

    if (hubNode && HV > 0.01) {
      for (const [d0, span] of [[0, 750], [220, 750]]) {
        const p = (t - IGNITE - d0) / span;
        if (p > 0 && p < 1) {
          ctx.strokeStyle = `rgba(${accRGB()},${((1 - p) * 0.5).toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(hubNode.x, hubNode.y, 10 + 110 * p, 0, Math.PI * 2); ctx.stroke();
        }
      }
      if (switchPulse > 0) {
        const p = (now - switchPulse) / 600;
        if (p < 1) {
          ctx.strokeStyle = `rgba(${accRGB()},${((1 - p) * 0.4).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(hubNode.x, hubNode.y, 8 + 42 * p, 0, Math.PI * 2); ctx.stroke();
        } else switchPulse = -1;
      }

      ctx.strokeStyle = `rgba(${accRGB()},${(dark ? 0.4 : 0.35) * HV})`;
      ctx.lineWidth = 0.7;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(0, mk.y); ctx.lineTo(W, mk.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mk.x, 0); ctx.lineTo(mk.x, H); ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = HV;
      ctx.fillStyle = accHex();
      ctx.beginPath();
      ctx.moveTo(mk.x, mk.y - 12); ctx.lineTo(mk.x - 5, mk.y - 20); ctx.lineTo(mk.x + 5, mk.y - 20);
      ctx.closePath(); ctx.fill();

      if (HV > 0.85) {
        ctx.font = '500 9px "IBM Plex Mono", monospace';
        ctx.fillStyle = `rgba(${accRGB()},0.9)`;
        const label = 'WHAT MATTERS';
        let lw = 0;
        for (const ch of label) lw += ctx.measureText(ch).width + 1.6;
        let lx = mk.x + 18, ly = mk.y - 30;
        if (lx + lw > W - 8) lx = mk.x - 18 - lw;
        if (ly < 14) ly = mk.y + 26;
        for (const ch of label) { ctx.fillText(ch, lx, ly); lx += ctx.measureText(ch).width + 1.6; }
      }
      ctx.globalAlpha = 1;
    }

    /* stray observations drift in — constellation only */
    if (INTRO && formation === 'constellation' && (introOver || ig >= 1)) {
      if (!nextBirth) nextBirth = now + 3500;
      else if (now >= nextBirth) {
        nextBirth = now + 5500 + Math.random() * 4500;
        if (nodes.length >= MAX_N) cull();
        const side = (Math.random() * 4) | 0;
        const sx = side === 0 ? -6 : side === 1 ? W + 6 : Math.random() * W;
        const sy = side < 2 ? Math.random() * H : (side === 2 ? -6 : H + 6);
        const p = clusterSample(weightedCluster());
        const n = makeNode(sx, sy, true);
        n.hx = p.x; n.hy = p.y;
        nodes.push(n);
      }
    }

    if (!REDUCED) requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  if (REDUCED) { frame(performance.now()); }
  else { requestAnimationFrame(frame); }
})();
```

- [ ] **Step 2: Swap the script tag in `index.html`**

Replace:
```html
  <script src="assets/js/fig1-graph.js?v=20260709a" defer></script>
```
with:
```html
  <script src="assets/js/figure-engine.js?v=20260709b" defer></script>
```

- [ ] **Step 3: Delete the superseded file**

```bash
git rm assets/js/fig1-graph.js
```

- [ ] **Step 4: Verify parity + formation morphs**

Start a server (`python3 -m http.server 8741`), then run this check (adapt paths to the session scratchpad; `puppeteer-core` is installed in Task 4 — if not yet available, install it first with `npm i -D puppeteer-core`):

```js
// quick check: engine boots, intro plays, formations switch
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const p = await b.newPage();
  await p.setViewport({ width: 1728, height: 960 });
  await p.goto('http://localhost:8741/index.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));
  console.log('formation:', await p.evaluate(() => window.FigureEngine.formation)); // constellation
  await p.evaluate(() => window.FigureEngine.setFormation('orbit'));
  await new Promise(r => setTimeout(r, 1500));
  await p.screenshot({ path: 'engine-orbit.png' });
  console.log('after:', await p.evaluate(() => window.FigureEngine.formation)); // orbit
  await b.close();
})();
```

Expected: `formation: constellation`, `after: orbit`, and `engine-orbit.png` shows an ellipse ring of particles with no edges/marker. Also eyeball the hero at 3s — identical character to the pre-refactor constellation (label, crosshair, marker on the big cluster).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(figure): formation engine — constellation/dispersal/margins/grid/rows/orbit morphs"
```

---

### Task 2: Restructure index.html into stage + scenes (stacked baseline)

**Files:**
- Modify: `index.html`
- Modify: `src/document.css` (baseline styles only — deck styles come in Task 3)
- Create: `assets/js/plates.js`
- Delete: `assets/js/fig8-orbit.js`

**Interfaces:**
- Consumes: `FigureEngine` (canvas markup only; no JS calls here).
- Produces: DOM contract for Task 3/4 — `#stage` containing `#net` + six `section.scene` elements with `data-formation`, `data-plate` (`light|dark`), `data-fig`, `data-hint` attributes; scene IDs `home, abstract, work, activity, writing, contact`; deck strip `#deck-strip` with `#strip-caption`, `#strip-hint`, `#deck-prev`, `#deck-next`; plates markup `#plate-list` (rows carry `data-thumb`, `data-cap`) + `#plate-preview` (`img` + `#plate-preview-cap`).

This task must leave the page rendering correctly as a **stacked scrolling document** (the no-JS/mobile baseline) — the deck engine does not exist yet.

- [ ] **Step 1: Restructure the body of `index.html`**

Keep `<div class="meta-top">` exactly as is, except the counter placeholder:
```html
    <span class="pageno mono" id="pageno">01 / 06</span>
```

Replace everything from `<!-- ============ HERO SHEET ============ -->` through the closing `</footer>` with:

```html
<!-- ============ STAGE / SCENES ============ -->
<main id="stage">
  <canvas id="net" aria-hidden="true"></canvas>

  <!-- 01 · Field Notes -->
  <section class="scene" id="home" data-formation="constellation" data-plate="light"
    data-fig="Fig. 1 — Structure emerges through relation. Marker tracks densest structure."
    data-hint="▲ what matters · cursor — gather · click — add observation">
    <div class="hero-block">
      <span class="hero-eyebrow mono">Doc BP-2026 · Field Notes on Research Intelligence</span>
      <h1>I build <span class="em">research intelligence systems</span> — instruments for discovering what matters.</h1>
      <p class="subline">Scattered information becomes connected context.<br>Connected context becomes judgment.</p>
      <div class="hero-actions">
        <a class="cta cta-solid" href="#work">View Case Studies <span>→</span></a>
        <a class="cta" href="#contact">Start a conversation <span>→</span></a>
      </div>
    </div>
  </section>

  <!-- 02 · Abstract -->
  <section class="scene" id="abstract" data-formation="dispersal" data-plate="dark"
    data-fig="Fig. 2 — Dispersal. Scattered information, awaiting relation."
    data-hint="">
    <canvas class="atmo" id="atmo" aria-hidden="true"></canvas>
    <div class="grain" id="grain" aria-hidden="true"></div>
    <div class="sec-body">
      <span class="eyebrow-label mono">02 — Curious, yet practical</span>
      <h2>Abstract</h2>
      <div class="abstract">
        <p class="lead">As a deeply curious-yet-practical person, I find great satisfaction in employing my skills to solve problems that <span class="em">actually need solutions</span>. Being able to effectively communicate complex ideas means understanding what the other person needs to know, and being able to speak their language. This is a skill, maybe even an art, that I have intentionally cultivated throughout my life, and I hope you'll find it demonstrated in my portfolio projects and writing.</p>
        <div class="detail">
          <p>My portfolio consists of projects that I created because I needed them to exist:</p>
          <ul class="origins">
            <li><span class="no">i.</span><span>I built <a href="projects/noeron.html">Noeron</a> because I wanted to remove the friction between consuming scientific podcasts and validating the claims being made.</span></li>
            <li><span class="no">ii.</span><span>While shopping for a new house, I found the existing platforms didn't provide the data I needed to make an informed decision, so I conducted my own <a href="projects/st-pete.html">St. Pete property-risk analysis</a>.</span></li>
            <li><span class="no">iii.</span><span>I ran the same open-data pipeline on the region's jobs numbers to see what the economy is built on — a <a href="projects/tampa-labor.html">Tampa Bay labor-market analysis</a>.</span></li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- 03 · Selected Work -->
  <section class="scene" id="work" data-formation="margins" data-plate="light"
    data-fig="Fig. 3 — Table of plates. Five instruments, 2025–2026."
    data-hint="hover — preview · click — open case study">
    <div class="sec-body">
      <span class="eyebrow-label mono">03 — Plates I–V</span>
      <h2>Selected Work</h2>
      <div class="plates-index">
        <ul class="plate-list" id="plate-list">
          <li class="on">
            <a href="projects/st-pete.html" data-thumb="assets/img/projects/st-pete.png" data-cap="Plate I · Fig. 2 — Parcel-level catastrophe model">
              <span class="no mono">Plate I</span>
              <span class="t">St. Pete Property-Risk Analysis
                <span class="d">A from-scratch flood catastrophe model. Sees what Zillow and Redfin can't.</span></span>
              <span class="stack mono">DuckDB · dbt · FastAPI · MapLibre</span>
            </a>
          </li>
          <li>
            <a href="projects/noeron.html" data-thumb="assets/img/projects/noeron.png" data-cap="Plate II · Fig. 3 — Knowledge layer for podcasts">
              <span class="no mono">Plate II</span>
              <span class="t">Noeron
                <span class="d">Detects scientific claims in podcasts, validates them against the literature.</span></span>
              <span class="stack mono">Gemini 3 · Python · Next.js · Supabase</span>
            </a>
          </li>
          <li>
            <a href="projects/tampa-labor.html" data-thumb="assets/img/projects/tampa-labor.png" data-cap="Plate III · Fig. 4 — What the metro runs on">
              <span class="no mono">Plate III</span>
              <span class="t">Tampa Bay Labor-Market Analysis
                <span class="d">What the economy actually runs on — and why where people work isn't where they live.</span></span>
              <span class="stack mono">BLS OEWS · Census ACS · DuckDB · marimo</span>
            </a>
          </li>
          <li>
            <a href="projects/morphic.html" data-thumb="assets/img/projects/morphic.png" data-cap="Plate IV · Fig. 5 — Cross-domain research engine">
              <span class="no mono">Plate IV</span>
              <span class="t">Morphic
                <span class="d">Extracts structural patterns from a 150+ paper corpus, routes them to specialist agents.</span></span>
              <span class="stack mono">Multi-agent · Pattern extraction</span>
            </a>
          </li>
          <li>
            <a data-cap="Plate V · Fig. 6 — Geopolitical supply-chain risk">
              <span class="no mono">Plate V</span>
              <span class="t">Critical Minerals Intelligence
                <span class="d">Interactive mapping, automated news monitoring, HHI-based supply-chain risk scoring.</span></span>
              <span class="stack mono">Mapping · News monitoring · HHI</span>
            </a>
          </li>
        </ul>
        <figure class="plate-preview" id="plate-preview">
          <div class="frame">
            <img src="assets/img/projects/st-pete.png" alt="Selected plate preview" id="plate-preview-img">
            <div class="thumb-placeholder" id="plate-preview-empty" hidden>No figure on file</div>
          </div>
          <figcaption class="mono" id="plate-preview-cap">Plate I · Fig. 2 — Parcel-level catastrophe model</figcaption>
        </figure>
      </div>
    </div>
  </section>

  <!-- 04 · Observation Log -->
  <section class="scene" id="activity" data-formation="grid" data-plate="light"
    data-fig="Fig. 4 — Observation log, Jan – Jun 2026."
    data-hint="">
    <div class="sec-body">
      <span class="eyebrow-label mono">04 — Jan – Jun 2026</span>
      <h2>Observation Log</h2>
      <div class="obs-frame">
        <div class="obs-canvas-wrap">
          <div class="heatmap-wrap">
            <div id="heatmap" class="heatmap"></div>
          </div>
        </div>
        <div class="obs-caption">
          <span class="mono" id="heatmap-caption">Loading GitHub activity…</span>
          <span class="mono"><a href="https://github.com/beckpiscopo" target="_blank" rel="noopener">View on GitHub ↗</a></span>
        </div>
      </div>
    </div>
  </section>

  <!-- 05 · References -->
  <section class="scene" id="writing" data-formation="rows" data-plate="light"
    data-fig="Fig. 5 — Selected writing."
    data-hint="">
    <div class="sec-body">
      <span class="eyebrow-label mono">05 — Selected writing</span>
      <h2>References</h2>
      <ul class="refs">
        <li>
          <span class="no">[1]</span>
          <span>
            <a class="title" href="https://beckpiscopo.substack.com/p/the-case-for-quantum-bioelectricity" target="_blank" rel="noopener">The Case for Quantum Bioelectricity</a>
            <div class="sub">How Decentralized Science Can Propel Emerging Fields</div>
          </span>
          <span class="year">2026</span>
        </li>
        <li>
          <span class="no">[2]</span>
          <span>
            <a class="title" href="https://beckpiscopo.substack.com/p/the-desci-solution" target="_blank" rel="noopener">The DeSci Solution</a>
            <div class="sub">Moving Beyond the Limitations of Traditional Science</div>
          </span>
          <span class="year">2026</span>
        </li>
      </ul>
    </div>
  </section>

  <!-- 06 · Correspondence -->
  <section class="scene footer" id="contact" data-formation="orbit" data-plate="dark"
    data-fig="Fig. 6 — Open orbit. New bodies welcome."
    data-hint="◆ you, perhaps">
    <div class="footer-cta">
      <span class="eyebrow-label mono">06 — Correspondence</span>
      <p class="big">If you'd like to explore how I can help <span class="em">your team</span>, let's connect.</p>
      <a class="cta" href="mailto:beckpiscopo@gmail.com" style="margin-top:2.6rem">Start a conversation <span>→</span></a>
      <div class="footer-channels mono">
        <a href="https://github.com/beckpiscopo" target="_blank" rel="noopener">GitHub ↗</a>
        <a href="https://x.com/beckpiscopo" target="_blank" rel="noopener">X / Twitter ↗</a>
        <a href="https://beckpiscopo.substack.com/" target="_blank" rel="noopener">Substack ↗</a>
      </div>
    </div>
    <div class="colophon">
      <div class="mono"><span class="k">Doc Ref</span><span class="v">BP-2026</span></div>
      <div class="mono"><span class="k">Observed From</span><span class="v">St. Petersburg, FL · 27.77° N, 82.64° W</span></div>
      <div class="mono"><span class="k">Current Work</span><span class="v">Noeron · Morphic · Decision Intelligence</span></div>
      <div class="mono"><span class="k">Field Notes</span><span class="v">E-0001</span></div>
    </div>
  </section>
</main>

<!-- deck caption strip (chrome; hidden unless the deck boots) -->
<div id="deck-strip" hidden>
  <span class="mono" id="strip-caption"></span>
  <span class="mono" id="strip-hint"></span>
  <span class="deck-arrows">
    <button id="deck-prev" class="mono" aria-label="Previous scene">↑</button>
    <button id="deck-next" class="mono" aria-label="Next scene">↓</button>
  </span>
</div>
```

Notes: hero loses `.sheet`/`.main`/`.headline-cell`/`.figure-cell` (canvas is now stage-level); `data-sec` attributes and `reveal` classes are dropped from sections (the deck owns entrances; mobile keeps natural flow); footer keeps class `footer` for its existing text styles.

- [ ] **Step 2: Update the script block at the bottom of `index.html`**

Remove the fig8-orbit line entirely; keep reveal.js (mobile still uses it — the deck neutralizes it in Task 3); add plates.js and (in Task 4) scenes.js:

```html
  <script src="assets/js/mobile-nav.js?v=20260708d" defer></script>
  <script src="assets/js/site.js?v=20260707a"></script>
  <script src="assets/js/figure-engine.js?v=20260709b" defer></script>
  <script src="assets/js/abstract-plate.js?v=20260707a" defer></script>
  <script src="assets/js/plates.js?v=20260709b" defer></script>
  <script src="assets/js/reveal.js?v=20260707a" defer></script>
```

```bash
git rm assets/js/fig8-orbit.js
```

Also check `assets/js/site.js` — if it contains scroll-driven pageno logic tied to `data-sec` sections, guard it: it must no-op when `document.getElementById('stage')` exists and `html.deck-on` is set (Task 4's controller owns the counter). Read the file and wrap its scroll handler in `if (!document.documentElement.classList.contains('deck-on')) { ... }`.

- [ ] **Step 3: Baseline (no-deck) CSS in `src/document.css`**

Delete the now-orphaned rules: `.sheet`, `.main`, `.headline-cell`, `.headline-inner`, `.headline-caption`, `.continue-cue`, `.figure-cell`, `.figure-canvas-wrap`, `.figure-caption`, `.plates-grid`, `.plate` (and `.plate.featured`, `.plate .thumb`, etc.), `.footer-main`, `.footer-fig`, `.orbit-wrap` — and the `@media (max-width: 720px)` references to `.headline-inner`/`.headline-caption`/`.figure-caption`. Keep `.hero-eyebrow`, `h1`, `.subline`, `.hero-actions`, `.cta*`, hero-rise animation, `.origins`, `.refs`, `.obs-*`, `.colophon`, `.footer-cta`, `.thumb-placeholder` (reused by the preview).

Add:

```css
/* ================= STAGE (baseline: stacked document) ================= */
#stage { position: relative; }
#net { position: absolute; top: 0; left: 0; width: 100%; height: 100svh; }

.scene { position: relative; border-top: 1px solid var(--hairline-soft); }
.scene#home { border-top: none; }

/* hero: full-bleed figure with text anchored bottom-left */
#home {
  min-height: 100svh;
  display: flex;
  align-items: flex-end;
}
.hero-block {
  position: relative;
  z-index: 1;
  padding: 0 3rem 5.5rem 2.5rem;
  max-width: 46rem;
}
@media (max-width: 720px) { .hero-block { padding: 0 1.5rem 3.5rem; } }

/* abstract keeps its scoped dark plate in the stacked baseline */

/* table of plates */
.plates-index { display: grid; grid-template-columns: 1.1fr 1fr; gap: 3rem; align-items: start; }
@media (max-width: 900px) { .plates-index { grid-template-columns: 1fr; } }
.plate-list { border-top: 1px solid var(--hairline); }
.plate-list li { list-style: none; }
.plate-list a {
  display: grid;
  grid-template-columns: 5.2rem 1fr auto;
  gap: 1.4rem;
  align-items: baseline;
  padding: 1.1rem 0.6rem 1.1rem 0.2rem;
  border-bottom: 1px solid var(--hairline-soft);
  text-decoration: none;
  cursor: pointer;
  transition: background .15s;
}
.plate-list a:hover, .plate-list li.on a { background: color-mix(in srgb, var(--color-caramel) 7%, transparent); }
.plate-list .no { color: var(--accent); padding-top: .2rem; }
.plate-list .t { font-family: var(--font-serif-display); font-size: 1.15rem; line-height: 1.3; }
.plate-list .t .d {
  display: block;
  font-family: var(--font-sans, inherit);
  font-size: .88rem;
  line-height: 1.5;
  margin-top: .25rem;
  color: color-mix(in srgb, var(--doc-ink) 62%, transparent);
}
.plate-list .stack { white-space: nowrap; }
@media (max-width: 720px) { .plate-list .stack { display: none; } }
.plate-preview { position: sticky; top: 5rem; }
.plate-preview .frame {
  position: relative;
  border: 1px solid var(--hairline);
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-caramel) 8%, transparent);
}
.plate-preview img { width: 100%; height: 100%; object-fit: cover; object-position: top center; filter: sepia(.08) saturate(.95); }
.plate-preview figcaption { display: block; padding: .7rem .2rem; border-bottom: 1px solid var(--hairline-soft); }
@media (max-width: 900px) { .plate-preview { display: none; } }

/* footer scene (stacked baseline) */
#contact { display: flex; flex-direction: column; min-height: 70vh; }
#contact .footer-cta { flex: 1; max-width: 1280px; width: 100%; margin: 0 auto; }

/* deck strip is chrome — nothing shows unless the deck boots */
#deck-strip { display: none; }
```

Remove the old `.footer` fixed `min-height: 88vh` / grid rules that referenced `.footer-main` (keep `.footer` color/背景 tokens: `background: var(--plate-footer)`, ink overrides, `.colophon` styles).

- [ ] **Step 4: Write `assets/js/plates.js`**

```js
// Table of plates: hovering/focusing an index row swaps the preview figure.
(function () {
  const list = document.getElementById('plate-list');
  const img = document.getElementById('plate-preview-img');
  const empty = document.getElementById('plate-preview-empty');
  const cap = document.getElementById('plate-preview-cap');
  if (!list || !img || !cap) return;

  function select(li) {
    const a = li.querySelector('a');
    if (!a) return;
    list.querySelectorAll('li').forEach(x => x.classList.toggle('on', x === li));
    cap.textContent = a.dataset.cap || '';
    if (a.dataset.thumb) {
      img.src = a.dataset.thumb;
      img.hidden = false;
      if (empty) empty.hidden = true;
    } else {
      img.hidden = true;
      if (empty) empty.hidden = false;
    }
  }

  list.querySelectorAll('li').forEach(li => {
    li.addEventListener('pointerenter', () => select(li));
    const a = li.querySelector('a');
    if (a) a.addEventListener('focus', () => select(li));
  });
})();
```

- [ ] **Step 5: Rebuild CSS and verify the stacked baseline**

```bash
npm run build-css
python3 -m http.server 8741 &
```

Live-capture (puppeteer harness) at 1728×960 and via a 390px iframe: hero renders full-bleed (text bottom-left over constellation), then Abstract/Work/Log/References/Contact stack and scroll normally; the plates index swaps previews on hover; no `#deck-strip` visible; no console errors (`page.on('console')`). The heatmap still renders. Expected: visually coherent stacked page — this exact rendering is the final mobile/no-JS mode.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(home): stage/scene markup, full-bleed hero, table of plates — stacked baseline"
```

---

### Task 3: Deck CSS

**Files:**
- Modify: `src/document.css`

**Interfaces:**
- Consumes: DOM contract from Task 2.
- Produces: all `html.deck-on` rules Task 4's controller relies on: `.scene.active/.above` classes drive transitions; `#stage[data-plate="dark"]` drives the stage background; `#deck-strip` visible.

- [ ] **Step 1: Append deck styles to `src/document.css`**

```css
/* ================= SCENE DECK (html.deck-on, ≥901px, JS on) ================= */
html.deck-on { overflow: hidden; }
html.deck-on body { overflow: hidden; }

html.deck-on .meta-top { position: fixed; top: 0; left: 0; right: 0; }

html.deck-on #stage {
  position: fixed;
  inset: 0;
  background: var(--color-background);
  transition: background-color .65s ease;
}
html.deck-on #stage[data-plate="dark"] { background: var(--plate-abstract); }

html.deck-on #net { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }

html.deck-on .scene {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-top: none;
  opacity: 0;
  pointer-events: none;
  transform: translateY(26px);
  transition: opacity .65s ease, transform .65s ease;
  overflow-y: auto;
  padding: 4.6rem 0 3.4rem;   /* clear the fixed nav + strip */
  display: flex;
  flex-direction: column;
  justify-content: center;
}
html.deck-on .scene.above { transform: translateY(-26px); }
html.deck-on .scene.active {
  opacity: 1;
  pointer-events: auto;
  transform: none;
  z-index: 2;
}

/* scenes are windows onto the stage — their own plates go transparent */
html.deck-on #abstract { background: transparent; }
html.deck-on #contact.footer { background: transparent; min-height: 0; }
html.deck-on #home { min-height: 0; }
html.deck-on .hero-block { padding-bottom: 2rem; }

/* dark-plate ink for the whole scene body (abstract already self-scopes;
   contact inherits from .footer rules) */

/* the deck strip */
html.deck-on #deck-strip {
  display: flex;
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 10;
  align-items: baseline;
  justify-content: space-between;
  gap: 2rem;
  padding: .8rem 2.5rem;
  border-top: 1px solid var(--hairline-soft);
  background: transparent;
}
html.deck-on #stage[data-plate="dark"] ~ #deck-strip { border-color: rgba(242,233,228,.18); }
html.deck-on #stage[data-plate="dark"] ~ #deck-strip .mono { color: rgba(242,233,228,.62); }
#deck-strip .deck-arrows { display: flex; gap: .5rem; }
#deck-strip button {
  background: none;
  border: 1px solid var(--hairline-soft);
  font-family: var(--font-mono);
  font-size: .7rem;
  color: inherit;
  cursor: pointer;
  padding: .3rem .55rem;
  transition: border-color .15s, color .15s;
}
#deck-strip button:hover { border-color: var(--accent); color: var(--accent); }

/* deck owns entrances — neutralize scroll-reveal */
html.deck-on .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }

/* reduced motion: instant cuts */
@media (prefers-reduced-motion: reduce) {
  html.deck-on .scene, html.deck-on #stage { transition: none; }
}
```

- [ ] **Step 2: Rebuild and sanity-check nothing regressed**

```bash
npm run build-css
```

Reload the stacked page — identical to Task 2's result (all new rules are scoped under `html.deck-on`, which nothing sets yet).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(deck): scene-deck styles under html.deck-on scope"
```

---

### Task 4: Deck controller + verification suite

**Files:**
- Create: `assets/js/scenes.js`
- Create: `scripts/verify-deck.mjs`
- Modify: `index.html` (add script tag), `package.json` (devDependency)

**Interfaces:**
- Consumes: DOM contract from Task 2, deck CSS from Task 3, `window.FigureEngine.setFormation(name)` from Task 1.
- Produces: the working deck. Boot condition: viewport ≥901px and JS. Sets `html.deck-on`; exposes nothing global (all behavior via DOM/inputs).

- [ ] **Step 1: Write `assets/js/scenes.js`**

```js
// Scene deck controller. Boots only on ≥901px viewports; otherwise the
// page remains the stacked scrolling document. All inputs funnel into
// go(n); a transition lock + wheel accumulator + settle window prevent
// trackpad momentum from double-advancing.
(function () {
  if (!matchMedia('(min-width: 901px)').matches) return;
  const stage = document.getElementById('stage');
  if (!stage) return;
  const scenes = Array.from(stage.querySelectorAll('.scene'));
  if (scenes.length < 2) return;

  const html = document.documentElement;
  html.classList.add('deck-on');

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = REDUCED ? 0 : 650;
  const SETTLE = 350;
  const THRESHOLD = 90;

  const pageno = document.getElementById('pageno');
  const strip = document.getElementById('deck-strip');
  const capEl = document.getElementById('strip-caption');
  const hintEl = document.getElementById('strip-hint');
  if (strip) strip.hidden = false;

  let cur = -1, locked = false, lastGo = 0, acc = 0;
  const byHash = {};
  scenes.forEach((s, i) => { byHash['#' + s.id] = i; });

  function apply(i) {
    scenes.forEach((s, j) => {
      s.classList.toggle('active', j === i);
      s.classList.toggle('above', j < i);
      s.setAttribute('aria-hidden', j === i ? 'false' : 'true');
    });
    const s = scenes[i];
    if (pageno) pageno.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(scenes.length).padStart(2, '0');
    if (capEl) capEl.textContent = s.dataset.fig || '';
    if (hintEl) hintEl.textContent = s.dataset.hint || '';
    stage.dataset.plate = s.dataset.plate || 'light';
    if (window.FigureEngine && s.dataset.formation) window.FigureEngine.setFormation(s.dataset.formation);
    history.replaceState(null, '', s.id === 'home' ? location.pathname + location.search : '#' + s.id);
  }

  function go(n) {
    n = Math.max(0, Math.min(scenes.length - 1, n));
    if (n === cur || locked) return;
    locked = true;
    lastGo = performance.now();
    cur = n;
    apply(n);
    const h = scenes[n].querySelector('h1, h2, .big');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    setTimeout(() => { locked = false; acc = 0; }, DUR + SETTLE);
  }

  /* wheel — scene-internal scroll wins until its boundary */
  window.addEventListener('wheel', (e) => {
    const sc = scenes[cur];
    if (sc && sc.scrollHeight > sc.clientHeight + 2) {
      const atTop = sc.scrollTop <= 0;
      const atBottom = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
      if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return;
    }
    e.preventDefault();
    if (locked || performance.now() - lastGo < DUR + SETTLE) return;
    acc += e.deltaY;
    if (acc > THRESHOLD) go(cur + 1);
    else if (acc < -THRESHOLD) go(cur - 1);
  }, { passive: false });

  /* touch swipe (tablets above the mobile breakpoint) */
  let touchY = null;
  window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (touchY === null) return;
    const dy = touchY - e.changedTouches[0].clientY;
    touchY = null;
    if (Math.abs(dy) > 60) go(cur + (dy > 0 ? 1 : -1));
  }, { passive: true });

  /* keyboard */
  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(cur + 1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(scenes.length - 1); }
  });

  /* in-page anchors (nav links, CTAs) + external hash changes */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const i = byHash[a.getAttribute('href')];
    if (i !== undefined) { e.preventDefault(); go(i); }
  });
  window.addEventListener('hashchange', () => {
    const i = byHash[location.hash];
    if (i !== undefined) go(i);
  });

  /* strip arrows */
  const prev = document.getElementById('deck-prev');
  const next = document.getElementById('deck-next');
  if (prev) prev.addEventListener('click', () => go(cur - 1));
  if (next) next.addEventListener('click', () => go(cur + 1));

  /* boot on the deep-linked scene if present */
  go(byHash[location.hash] !== undefined ? byHash[location.hash] : 0);
})();
```

- [ ] **Step 2: Add the script tag to `index.html`** (after figure-engine, before plates):

```html
  <script src="assets/js/scenes.js?v=20260709b" defer></script>
```

- [ ] **Step 3: Install the verification dependency**

```bash
npm i -D puppeteer-core
```

- [ ] **Step 4: Write `scripts/verify-deck.mjs`**

```js
// Deck verification: scene walk, hash deep-links, keyboard nav, themes,
// mobile fallback, reduced motion. Run: node scripts/verify-deck.mjs
// (expects a local server on :8741 serving the repo root)
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:8741/index.html';
const shots = [];
let failures = 0;

function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });

/* --- desktop deck --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 960 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4200)); // let intro play

  check('deck boots', await page.evaluate(() => document.documentElement.classList.contains('deck-on')));
  check('scene 1 active', await page.evaluate(() => document.querySelector('.scene.active')?.id) === 'home');
  check('counter', (await page.evaluate(() => document.getElementById('pageno')?.textContent)).trim() === '01 / 06');

  // walk all scenes by keyboard
  const ids = ['abstract', 'work', 'activity', 'writing', 'contact'];
  for (const id of ids) {
    await page.keyboard.press('ArrowDown');
    await new Promise(r => setTimeout(r, 1200));
    const active = await page.evaluate(() => document.querySelector('.scene.active')?.id);
    check(`keyboard → ${id}`, active === id, `got ${active}`);
    await page.screenshot({ path: `scripts/out/scene-${id}.png` });
  }
  check('hash tracked', await page.evaluate(() => location.hash) === '#contact');
  check('formation orbit', await page.evaluate(() => window.FigureEngine.formation) === 'orbit');

  // walk back up to home
  for (let i = 0; i < 5; i++) { await page.keyboard.press('ArrowUp'); await new Promise(r => setTimeout(r, 1150)); }
  check('back to home', await page.evaluate(() => document.querySelector('.scene.active')?.id) === 'home');

  // dark theme spot-check
  await page.click('#theme-toggle-btn');
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: 'scripts/out/scene-home-dark.png' });
  await page.close();
}

/* --- hash deep link --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 960 });
  await page.goto(URL + '#work', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  check('deep link #work', await page.evaluate(() => document.querySelector('.scene.active')?.id) === 'work');
  await page.close();
}

/* --- mobile fallback --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  check('mobile: no deck', await page.evaluate(() => !document.documentElement.classList.contains('deck-on')));
  check('mobile: page scrolls', await page.evaluate(() => document.body.scrollHeight > window.innerHeight));
  await page.screenshot({ path: 'scripts/out/mobile.png' });
  await page.close();
}

/* --- reduced motion --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 960 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));
  await page.keyboard.press('ArrowDown');
  await new Promise(r => setTimeout(r, 500));
  check('reduced motion: instant advance', await page.evaluate(() => document.querySelector('.scene.active')?.id) === 'abstract');
  await page.close();
}

await browser.close();
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 5: Run the suite**

```bash
mkdir -p scripts/out && echo "scripts/out/" >> .gitignore
python3 -m http.server 8741 > /dev/null 2>&1 &
node scripts/verify-deck.mjs
kill %1
```

Expected: `ALL CHECKS PASSED`. Review every screenshot in `scripts/out/` — each scene composed, formations distinct (dispersal dust behind Abstract, margins behind Work, grid behind Log, rows behind References, orbit ring on Contact), dark plates on scenes 2/6, strip caption matching the scene. Fix and re-run until green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(deck): scene controller — wheel/touch/keys/hash/arrows, caption strip, verification suite"
```

---

### Task 5: Tune, polish, and hand off for review

**Files:**
- Modify: `assets/js/figure-engine.js`, `src/document.css` (constants only, as needed)

**Interfaces:**
- Consumes: everything prior.
- Produces: the reviewed, deployed-preview-ready deck.

- [ ] **Step 1: Capture transition mid-frames**

Extend a scratch copy of the capture harness: trigger `ArrowDown`, screenshot at +200ms/+500ms/+900ms. Judge the morphs: nodes should visibly *travel* (not teleport or crawl). Tune per-formation heat (the `heatUntil` 900ms window and 2.2 multiplier) and `THRESHOLD`/`SETTLE` in scenes.js if transitions feel laggy or jumpy.

- [ ] **Step 2: Full manual pass**

Real browser, both themes: trackpad flick = exactly one scene; fast repeated flicks don't skip; scene 3 preview hover works; Abstract's atmo/grain still render on the dark plate; heatmap intact on scene 4; mail CTA works on scene 6; `Cmd+R` on `#activity` boots into the Observation Log.

- [ ] **Step 3: Update `DESIGN.md`** with a short section describing the deck (scenes, formations, fallbacks) so future sessions have the map.

- [ ] **Step 4: Final commit + push for deploy preview**

```bash
git add -A
git commit -m "feat(home): scene-deck homepage — six scenes over one morphing figure"
git push
```

User reviews the deployed preview before any merge to `main`.

---

## Self-Review Notes

- **Spec coverage:** six scenes ✔ (Task 2 markup), persistent morphing canvas ✔ (Task 1), discrete engine with five input paths ✔ (Task 4), table of plates ✔ (Tasks 2/4), caption strip ✔ (Tasks 2/3/4), mobile fallback ✔ (boot guard + baseline = stacked page, verified), reduced motion ✔ (engine + controller + suite), hash deep links ✔, orbit retires fig8 ✔, keep-out zone ✔ (Task 1 `inTextZone`), internal scroll boundary ✔ (wheel handler). Colophon deviation documented in Global Constraints.
- **Type consistency:** `FigureEngine.setFormation(name)` used identically in Tasks 1/4; scene `data-` attribute names consistent across Tasks 2/4; element IDs (`deck-strip`, `strip-caption`, `strip-hint`, `deck-prev`, `deck-next`, `plate-list`, `plate-preview-img/-cap/-empty`, `pageno`) consistent.
- **Known judgment calls left to Task 5 tuning:** formation heat constants, wheel threshold, strip typography.
