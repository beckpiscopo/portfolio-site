// mobile-nav.js — collapsible hamburger menu for small screens.
// No dependencies. Guards for missing elements so it is safe to load on all pages.
(function () {
  var btn  = document.getElementById('menu-btn');
  var menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  function openMenu() {
    menu.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
  }

  function closeMenu() {
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
  }

  // Toggle on hamburger click
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (menu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close when any link inside the panel is clicked
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      closeMenu();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      closeMenu();
      btn.focus();
    }
  });

  // Close on click outside the panel (and not on the button itself)
  document.addEventListener('click', function (e) {
    if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== btn) {
      closeMenu();
    }
  });
})();
