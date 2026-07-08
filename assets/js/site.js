// Shared site-chrome behavior. Loaded on every page that has the sidebar/header.
// All DOM lookups are guarded, so per-page markup differences are safe.
// NOTE: the sidebar/header HTML stays static in each page (no-JS nav must keep working);
// this file only wires up behavior.
(function () {
  const root = document.documentElement;
  root.classList.add('js');

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

  // Click-to-zoom lightbox for content images (charts, screenshots).
  // Images wrapped in a link (e.g. home-page project thumbnails) are skipped
  // so they keep navigating instead of zooming.
  const zoomImgs = Array.from(document.querySelectorAll('main img'))
    .filter((img) => !img.closest('a'));
  if (zoomImgs.length) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    const lightboxImg = document.createElement('img');
    lightboxImg.alt = '';
    lightbox.appendChild(lightboxImg);
    document.body.appendChild(lightbox);

    function openLightbox(src, alt) {
      lightboxImg.src = src;
      lightboxImg.alt = alt || '';
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden'; // freeze background scroll
    }
    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    zoomImgs.forEach((img) => {
      img.classList.add('zoomable');
      img.addEventListener('click', () => openLightbox(img.currentSrc || img.src, img.alt));
    });
    // Click anywhere on the backdrop closes; clicking the image itself does not.
    lightbox.addEventListener('click', closeLightbox);
    lightboxImg.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });
  }
})();
