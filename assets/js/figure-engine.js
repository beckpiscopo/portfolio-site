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
  /* exploded-diagram apparatus: former centroids + where their clusters went */
  const ghost = { items: [], vis: 0, target: 0 };
  const GHOST_LEADERS = true;   /* A/B: leader lines from ghost to exploded cluster */

  const mouse = { x: -9999, y: -9999, active: false };
  wrap.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
  });
  wrap.addEventListener('pointerleave', () => { mouse.active = false; mouse.x = -9999; mouse.y = -9999; });
  wrap.addEventListener('pointerdown', e => {
    if (!interactive) return;
    const r = canvas.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
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
    ghost.target = name === 'dispersal' ? 1 : 0;
    if (REDUCED) {
      for (const n of nodes) { n.x = n.hx; n.y = n.hy; n.vx = 0; n.vy = 0; }
      edgeVis = f.edges; hubVis = f.hub; stageAlpha = f.alpha; ghost.vis = ghost.target;
      requestAnimationFrame(frame);
    } else {
      heatUntil = performance.now() + 900;
      for (const n of nodes) {
        n.vx += (Math.random() - 0.5) * 2.2;
        n.vy += (Math.random() - 0.5) * 2.2;
      }
    }
  }
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
      if (formation === 'dispersal') layout();
      FORMS[formation].assign();
      if (REDUCED) {
        for (const n of nodes) { n.x = n.hx; n.y = n.hy; n.vx = 0; n.vy = 0; }
        requestAnimationFrame(frame);
      }
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
    ghost.vis += (ghost.target - ghost.vis) * 0.02;
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
