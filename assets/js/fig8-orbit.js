(function () {
  const c = document.getElementById('orbit');
  if (!c) return;

  const wrapEl = c.parentElement;
  const octx = c.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w, h;
  let running = false;

  const m = { x: 0.5, y: 0.5 };
  wrapEl.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    m.x = (e.clientX - r.left) / r.width;
    m.y = (e.clientY - r.top) / r.height;
  });

  function rs() {
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  rs();
  window.addEventListener('resize', rs);

  const MERIDIANS = 15;
  function draw(now) {
    if (!running) return;

    octx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.36;
    const t = now * 0.00006;

    /* gentle tilt toward cursor */
    const tilt = (m.x - 0.5) * 0.35;

    octx.save();
    octx.translate(cx, cy);
    octx.rotate(tilt);
    octx.translate(-cx, -cy);

    /* dotted meridians of a slowly precessing sphere */
    for (let i = 0; i < MERIDIANS; i++) {
      const lon = (i / MERIDIANS) * Math.PI + t * Math.PI * 2;
      const rx = Math.abs(Math.cos(lon)) * R;
      const front = Math.sin(lon) > 0;
      const warm = i % 3 === 0;
      const alpha = front ? 0.55 : 0.22;
      octx.strokeStyle = warm
        ? `rgba(190,90,56,${alpha})`
        : `rgba(190,124,77,${alpha})`;
      octx.lineWidth = 1;
      octx.setLineDash([2, 5]);
      octx.beginPath();
      octx.ellipse(cx, cy, Math.max(rx, 0.5), R, 0, 0, Math.PI * 2);
      octx.stroke();
    }
    octx.setLineDash([]);

    /* equator */
    octx.strokeStyle = 'rgba(242,233,228,0.3)';
    octx.setLineDash([2, 5]);
    octx.beginPath();
    octx.ellipse(cx, cy, R, R * 0.22, 0, 0, Math.PI * 2);
    octx.stroke();
    octx.setLineDash([]);

    /* the visitor: a cream diamond in open orbit */
    const oa = now * 0.00035;
    const ox = cx + Math.cos(oa) * R * 1.28;
    const oy = cy + Math.sin(oa) * R * 0.35;
    const behind = Math.sin(oa) < 0;
    octx.globalAlpha = behind ? 0.45 : 1;
    octx.fillStyle = '#F2E9E4';
    octx.save();
    octx.translate(ox, oy);
    octx.rotate(Math.PI / 4);
    octx.fillRect(-3.5, -3.5, 7, 7);
    octx.restore();
    octx.globalAlpha = 1;

    /* its dotted orbit path */
    octx.strokeStyle = 'rgba(242,233,228,0.18)';
    octx.setLineDash([2, 6]);
    octx.beginPath();
    octx.ellipse(cx, cy, R * 1.28, R * 0.35, 0, 0, Math.PI * 2);
    octx.stroke();
    octx.setLineDash([]);

    octx.restore();

    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(draw);
  }

  /* IntersectionObserver: rAF loop only runs while canvas is on screen */
  const footerEl = c.closest('.footer') || c;
  const observer = new IntersectionObserver(entries => {
    const vis = entries[0].isIntersecting;
    if (vis && !running) {
      running = true;
      requestAnimationFrame(draw);
    } else if (!vis) {
      running = false;
    }
  }, { threshold: 0 });
  observer.observe(footerEl);

  /* reduced motion: draw exactly one frame, never start the loop */
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    running = true;
    draw(performance.now());
    running = false;
  }
})();
