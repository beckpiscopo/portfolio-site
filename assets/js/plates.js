// Table of plates: hovering/focusing an index row swaps the preview figure.
(function () {
  const list = document.getElementById('plate-list');
  const img = document.getElementById('plate-preview-img');
  const empty = document.getElementById('plate-preview-empty');
  const cap = document.getElementById('plate-preview-cap');
  if (!list || !img || !cap) return;

  function select(li) {
    const a = li.querySelector('a');
    if (!a) return;
    list.querySelectorAll('li').forEach(x => x.classList.toggle('on', x === li));
    cap.textContent = a.dataset.cap || '';
    if (a.dataset.thumb) {
      img.src = a.dataset.thumb;
      img.hidden = false;
      if (empty) empty.hidden = true;
    } else {
      img.hidden = true;
      if (empty) empty.hidden = false;
    }
  }

  list.querySelectorAll('li').forEach(li => {
    li.addEventListener('pointerenter', () => select(li));
    const a = li.querySelector('a');
    if (a) a.addEventListener('focus', () => select(li));
  });
})();
