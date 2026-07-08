/* ---------- scroll reveal + pagination ---------- */
(function () {
  // Add reveal-init FIRST so the CSS can hide .reveal elements before JS observers
  // fire. Without this, .reveal elements flash visible on initial paint.
  // Under prefers-reduced-motion: reduce the CSS disables hiding entirely, so
  // reveal-init is still added but has no visible effect — harmless.
  document.documentElement.classList.add('reveal-init');

  const revealObs = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

  const pageno = document.getElementById('pageno');
  const secObs = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting && pageno) pageno.textContent = e.target.dataset.sec + ' / 05';
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('[data-sec]').forEach(el => secObs.observe(el));
})();
