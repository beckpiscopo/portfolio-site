// Fig. 1 — interactive network graph. 400 clustered nodes, spatial-hash
// neighbor queries, cursor-gravity gathering, click-to-add observations,
// accent marker tracking the densest node. Values validated in
// docs/superpowers/specs/assets/2026-07-07-homepage-mockup.html.
(function () {
  const canvas = document.getElementById('net');
  if (!canvas) return;
  const rootEl = document.documentElement;
  const isDark = () => rootEl.classList.contains('dark');
  const accRGB = () => getComputedStyle(rootEl).getPropertyValue('--accent-rgb').trim();
  const accHex = () => getComputedStyle(rootEl).getPropertyValue('--accent').trim();

  const wrap = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W, H, nodes = [];

  const BASE_N = 400;
  const MAX_N = 480;
  const LINK = 88;
  const GATHER_R = 190;
  const PAD = 14;
  const REPEL = 14;

  const mouse = { x: -9999, y: -9999, active: false };
  wrap.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
  });
  wrap.addEventListener('pointerleave', () => { mouse.active = false; mouse.x = -9999; mouse.y = -9999; });
  wrap.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    for (let k = 0; k < 6; k++) {
      if (nodes.length >= MAX_N) nodes.shift();
      const a = Math.random() * Math.PI * 2, rr = Math.random() * 18;
      nodes.push(makeNode(x + Math.cos(a) * rr, y + Math.sin(a) * rr, true));
    }
  });

  function makeNode(x, y, fresh) {
    return { x, y, hx: x, hy: y, vx: 0, vy: 0, r: 1.4 + Math.random() * 1.6, born: fresh ? performance.now() : 0 };
  }

  function gauss() {
    /* Box-Muller */
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!nodes.length) {
      /* asymmetric clusters: a few tight, heavy knots + loose satellites + scatter */
      const K = 6;
      const clusters = [];
      let weightSum = 0;
      for (let k = 0; k < K; k++) {
        const weight = Math.pow(Math.random(), 1.8) + 0.15;   /* skewed: few dominate */
        weightSum += weight;
        clusters.push({
          x: PAD + 40 + Math.random() * (W - PAD * 2 - 80),
          y: PAD + 40 + Math.random() * (H - PAD * 2 - 80),
          spread: 22 + Math.pow(Math.random(), 2) * 85,        /* some tight, some diffuse */
          weight,
        });
      }
      const SCATTER = 0.22;                                    /* fraction of loose background */
      for (let i = 0; i < BASE_N; i++) {
        if (Math.random() < SCATTER) {
          nodes.push(makeNode(PAD + Math.random() * (W - PAD * 2), PAD + Math.random() * (H - PAD * 2), false));
          continue;
        }
        /* pick a cluster by weight */
        let r = Math.random() * weightSum, c = clusters[0];
        for (const cl of clusters) { r -= cl.weight; if (r <= 0) { c = cl; break; } }
        const x = Math.max(PAD, Math.min(W - PAD, c.x + gauss() * c.spread));
        const y = Math.max(PAD, Math.min(H - PAD, c.y + gauss() * c.spread));
        nodes.push(makeNode(x, y, false));
      }
    }
  }

  /* spatial hash grid — rebuilt each frame */
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

  function frame(now) {
    ctx.clearRect(0, 0, W, H);
    const dark = isDark();

    const grid = buildGrid(LINK);

    /* physics */
    for (const n of nodes) {
      n.vx += (n.hx - n.x) * 0.0016;
      n.vy += (n.hy - n.y) * 0.0016;
      n.hx += Math.sin(now * 0.00012 + n.hy * 0.13) * 0.04;
      n.hy += Math.cos(now * 0.00010 + n.hx * 0.11) * 0.04;
      n.hx = Math.max(PAD, Math.min(W - PAD, n.hx));
      n.hy = Math.max(PAD, Math.min(H - PAD, n.hy));
      if (mouse.active) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < GATHER_R && d > 1) {
          const f = (1 - d / GATHER_R) * 0.055;
          n.vx += (dx / d) * f * d * 0.05;
          n.vy += (dy / d) * f * d * 0.05;
        }
      }
    }
    /* short-range repulsion via grid */
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

    /* edges + degree via grid — per-node edge budget keeps dense knots airy & fast */
    const EDGE_BUDGET = 9;
    const deg = new Array(nodes.length).fill(0);
    ctx.lineWidth = 0.55;
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
          const alpha = (1 - d / LINK) * (dark ? 0.18 : 0.22);
          ctx.strokeStyle = dark ? `rgba(242,233,228,${alpha.toFixed(3)})` : `rgba(62,31,20,${alpha.toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }

    /* hub = densest node */
    let hub = 0;
    for (let i = 1; i < nodes.length; i++) if (deg[i] > deg[hub]) hub = i;
    const h = nodes[hub];

    /* accent edges radiating from hub */
    ctx.lineWidth = 0.9;
    for (const j of neighbors(grid, LINK, h.x, h.y)) {
      if (j === hub) continue;
      const b = nodes[j];
      const d = Math.hypot(h.x - b.x, h.y - b.y);
      if (d < LINK) {
        ctx.strokeStyle = `rgba(${accRGB()},${(1 - d / LINK) * (dark ? 0.95 : 0.85)})`;
        ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    /* nodes */
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      let r = i === hub ? n.r + 1.8 : n.r;
      if (n.born) {
        const age = (now - n.born) / 600;
        if (age < 1) r *= 0.3 + age * 0.7;
      }
      ctx.fillStyle = i === hub
        ? accHex()
        : (dark ? 'rgba(242,233,228,0.8)' : 'rgba(62,31,20,0.75)');
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
    }

    /* crosshair through the hub */
    ctx.strokeStyle = `rgba(${accRGB()},${dark ? 0.4 : 0.35})`;
    ctx.lineWidth = 0.7;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(0, h.y); ctx.lineTo(W, h.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(h.x, 0); ctx.lineTo(h.x, H); ctx.stroke();
    ctx.setLineDash([]);

    /* marker */
    ctx.fillStyle = accHex();
    ctx.beginPath();
    ctx.moveTo(h.x, h.y - 12); ctx.lineTo(h.x - 5, h.y - 20); ctx.lineTo(h.x + 5, h.y - 20);
    ctx.closePath(); ctx.fill();

    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { frame(performance.now()); }
  else { requestAnimationFrame(frame); }
})();
