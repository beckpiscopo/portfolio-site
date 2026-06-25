// Shared site-chrome behavior. Loaded on every page that has the sidebar/header.
// All DOM lookups are guarded, so per-page markup differences are safe.
// NOTE: the sidebar/header HTML stays static in each page (no-JS nav must keep working);
// this file only wires up behavior.
(function () {
  const root = document.documentElement;
  root.classList.add('js');

  // Dark mode: auto by hour (19:00–06:59 dark), plus manual toggle.
  const hour = new Date().getHours();
  if (hour >= 19 || hour < 7) root.classList.add('dark');
  const darkToggle = document.getElementById('dark-toggle');
  if (darkToggle) darkToggle.addEventListener('click', () => root.classList.toggle('dark'));

  // Case-study pages have no #hero: dock the sidebar (skip the scroll morph).
  // The home page HAS a #hero and manages --p itself via its own scroll script,
  // so we leave it alone here.
  if (!document.getElementById('hero')) {
    root.style.setProperty('--p', 1);
    document.body.classList.add('scrolled');
  }

  // Mobile drawer
  const menuToggle = document.getElementById('menu-toggle');
  const sidebarEl = document.getElementById('sidebar');
  function closeDrawer() {
    document.body.classList.remove('drawer-open');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
    }
  }
  if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = document.body.classList.toggle('drawer-open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }
  // Close drawer after choosing a destination
  document.querySelectorAll('.toc a').forEach(a => a.addEventListener('click', closeDrawer));
  // Close drawer when tapping outside it (e.g. the backdrop scrim)
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('drawer-open') &&
        sidebarEl && !sidebarEl.contains(e.target) &&
        menuToggle && !menuToggle.contains(e.target)) {
      closeDrawer();
    }
  });
})();
