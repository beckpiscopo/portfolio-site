// Theme: stored choice wins, else OS preference. Binds any toggle present
// (#theme-toggle-btn on the homepage meta-bar, #dark-toggle on legacy pages).
(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('bp-theme');
  const dark = stored ? stored === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  root.classList.toggle('dark', dark);

  function bind(btn) {
    if (!btn) return;
    const label = () => { if (btn.id === 'theme-toggle-btn') btn.textContent = root.classList.contains('dark') ? '◑ Day' : '◐ Night'; };
    btn.addEventListener('click', () => {
      const nowDark = root.classList.toggle('dark');
      localStorage.setItem('bp-theme', nowDark ? 'dark' : 'light');
      label();
    });
    label();
  }
  document.addEventListener('DOMContentLoaded', () => {
    bind(document.getElementById('theme-toggle-btn'));
    bind(document.getElementById('dark-toggle'));
  });
})();
