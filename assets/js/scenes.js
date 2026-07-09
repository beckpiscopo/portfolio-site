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
      s.inert = j !== i;
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
    if (n === cur) { acc = 0; return; }
    if (locked) return;
    locked = true;
    lastGo = performance.now();
    const wasBoot = cur === -1;
    cur = n;
    apply(n);
    if (!wasBoot) {
      const h = scenes[n].querySelector('h1, h2, .big');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
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
