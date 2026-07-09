// Fig. 1 — interactive network graph. Choreographed constellation: tight
// clusters with deliberate negative space, background dust for depth,
// ringed "anchor" specimens, and a self-annotating hub marker.
//
// On load the graph performs the thesis once: nodes spawn as uniform
// scatter (no edges), fly home leaving comet trails while edges surface,
// then the densest structure ignites as "what matters" — labeled on the
// canvas like a plate annotation. Afterward it keeps breathing: stray
// observations drift in from the edges and the marker re-seeks with
// hysteresis when the densest structure shifts.
(function () {
  const canvas = document.getElementById('net');
  if (!canvas) return;
  const rootEl = document.documentElement;
  const isDark = () => rootEl.classList.contains('dark');
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
  const DUST = 0.16;       /* fraction of unclustered background dust */

  /* intro narrative clock — skipped entirely under reduced motion */
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INTRO = !REDUCED;
  const EDGE_IN = 500;     /* ms: edges begin to surface */
  const EDGE_RAMP = 1500;  /* ms: edge fade-in duration */
  const IGNITE = 2400;     /* ms: hub ignition */
  let t0 = null;
  const smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;

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
      dust: false, anchor: false,
    };
  }

  /* remove the oldest node that isn't the current hub */
  function cull() {
    const idx = nodes[0] === hubNode ? 1 : 0;
    nodes.splice(idx, 1);
  }

  function gauss() {
    /* Box-Muller */
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* deliberate composition: a protagonist cluster at a golden-ratio point
     (never clipped), supporting clusters kept well apart inside a margin */
  function layout() {
    clusters = [];
    const m = Math.min(W, H);
    const M = Math.max(PAD + 26, m * 0.13);
    const SEP = m * 0.3;
    const g = Math.random() < 0.5 ? [0.618, 0.382] : [0.382, 0.382];
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
      if (clusters.every(o => Math.hypot(o.x - c.x, o.y - c.y) > SEP)) clusters.push(c);
    }
  }

  function clusterSample(c) {
    /* tight core with a sparse halo */
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
        /* open in chaos: homes keep the structure, but every node starts
           at a uniform random position with a little heat */
        for (const n of nodes) {
          n.x = PAD + Math.random() * (W - PAD * 2);
          n.y = PAD + Math.random() * (H - PAD * 2);
          n.vx = (Math.random() - 0.5) * 3;
          n.vy = (Math.random() - 0.5) * 3;
        }
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

  /* hub state persists across frames: eased marker, switch hysteresis */
  let hubNode = null, hubSwitch = 0, switchPulse = -1;
  const mk = { x: 0, y: 0 };
  let nextBirth = 0;

  function frame(now) {
    const dark = isDark();

    /* intro clock: chaos → gather (edges surface) → ignition */
    if (t0 === null) t0 = now;
    const t = INTRO ? now - t0 : 1e9;
    const edgeFade = smooth((t - EDGE_IN) / EDGE_RAMP);
    const ig = smooth((t - IGNITE) / 600);
    /* ignition beat: base ink dips while the hub flares */
    const beat = 1 - 0.5 * Math.sin(Math.PI * clamp01((t - IGNITE) / 900));
    /* spring temperature: weak while chaotic, hot through the gather */
    const K = 0.0016 * (0.35 + 2.45 * smooth((t - 250) / 1350) - 1.8 * smooth((t - 1900) / 1000));

    /* comet trails during the gather; crisp clear once settled */
    const trail = INTRO ? 0.24 + 0.76 * smooth((t - IGNITE) / 900) : 1;
    if (trail >= 1) {
      ctx.clearRect(0, 0, W, H);
    } else {
      ctx.globalAlpha = trail;
      ctx.fillStyle = bgHex() || (dark ? '#1B0C05' : '#F2E9E4');
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    const grid = buildGrid(LINK);

    /* physics */
    for (const n of nodes) {
      n.vx += (n.hx - n.x) * K;
      n.vy += (n.hy - n.y) * K;
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

    /* edges + degree via grid — per-node edge budget keeps dense knots airy & fast.
       Edges surface only as structure forms: alpha scaled by the intro fade. */
    const EDGE_BUDGET = 9;
    const deg = new Array(nodes.length).fill(0);
    if (edgeFade > 0) {
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
            const alpha = (1 - d / LINK) * 0.3 * edgeFade * beat * dim;
            ctx.strokeStyle = dark ? `rgba(242,233,228,${alpha.toFixed(3)})` : `rgba(62,31,20,${alpha.toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
    }

    /* hub = truly densest node (uncapped neighbor count — edge degree
       saturates at the budget and ties arbitrarily), with hysteresis so
       the instrument re-seeks deliberately instead of flickering */
    let hi = -1;
    if (ig > 0) {
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

      /* accent edges radiating from hub */
      ctx.lineWidth = 0.9;
      for (const j of neighbors(grid, LINK, hubNode.x, hubNode.y)) {
        if (j === hi) continue;
        const b = nodes[j];
        const d = Math.hypot(hubNode.x - b.x, hubNode.y - b.y);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(${accRGB()},${(1 - d / LINK) * (dark ? 0.95 : 0.85) * ig})`;
          ctx.beginPath(); ctx.moveTo(hubNode.x, hubNode.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }

    /* nodes: dust recedes, anchors get a specimen ring, hub takes accent */
    const inkA = dark ? 'rgba(242,233,228,' : 'rgba(62,31,20,';
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      let r = i === hi ? n.r + 1.8 * ig : n.r;
      if (n.born) {
        const age = (now - n.born) / 600;
        if (age < 1) r *= 0.3 + age * 0.7;
      }
      ctx.fillStyle = i === hi ? accHex() : inkA + (n.dust ? 0.38 : 0.82) + ')';
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
      if (n.anchor && edgeFade > 0) {
        ctx.strokeStyle = inkA + (0.35 * edgeFade).toFixed(3) + ')';
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 3, 0, Math.PI * 2); ctx.stroke();
      }
    }

    if (hubNode && ig > 0) {
      /* ignition pulse — a double ring at the moment of judgment */
      for (const [d0, span] of [[0, 750], [220, 750]]) {
        const p = (t - IGNITE - d0) / span;
        if (p > 0 && p < 1) {
          ctx.strokeStyle = `rgba(${accRGB()},${((1 - p) * 0.5).toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(hubNode.x, hubNode.y, 10 + 110 * p, 0, Math.PI * 2); ctx.stroke();
        }
      }
      /* re-seek pulse when the marker migrates to a new densest structure */
      if (switchPulse > 0) {
        const p = (now - switchPulse) / 600;
        if (p < 1) {
          ctx.strokeStyle = `rgba(${accRGB()},${((1 - p) * 0.4).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(hubNode.x, hubNode.y, 8 + 42 * p, 0, Math.PI * 2); ctx.stroke();
        } else switchPulse = -1;
      }

      /* crosshair + marker ride the eased position — the instrument, not the node */
      ctx.strokeStyle = `rgba(${accRGB()},${(dark ? 0.4 : 0.35) * ig})`;
      ctx.lineWidth = 0.7;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(0, mk.y); ctx.lineTo(W, mk.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mk.x, 0); ctx.lineTo(mk.x, H); ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = ig;
      ctx.fillStyle = accHex();
      ctx.beginPath();
      ctx.moveTo(mk.x, mk.y - 12); ctx.lineTo(mk.x - 5, mk.y - 20); ctx.lineTo(mk.x + 5, mk.y - 20);
      ctx.closePath(); ctx.fill();

      /* the figure annotates itself */
      if (ig > 0.85) {
        ctx.font = '500 9px "IBM Plex Mono", monospace';
        ctx.fillStyle = `rgba(${accRGB()},0.9)`;
        const label = 'WHAT MATTERS';
        let lw = 0;
        for (const ch of label) lw += ctx.measureText(ch).width + 1.6;
        let lx = mk.x + 18, ly = mk.y - 30;
        if (lx + lw > W - 8) lx = mk.x - 14 - lw;
        if (ly < 14) ly = mk.y + 26;
        for (const ch of label) { ctx.fillText(ch, lx, ly); lx += ctx.measureText(ch).width + 1.6; }
      }
      ctx.globalAlpha = 1;
    }

    /* after settling, stray observations drift in from the edges */
    if (INTRO && ig >= 1) {
      if (!nextBirth) nextBirth = t + 3500;
      else if (t >= nextBirth) {
        nextBirth = t + 5500 + Math.random() * 4500;
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

    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { frame(performance.now()); }
  else { requestAnimationFrame(frame); }
})();
