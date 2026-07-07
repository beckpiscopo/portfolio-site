/* ---------- abstract atmosphere: rib band + grain (calm, static) ---------- */
(function () {
  if (!document.getElementById('atmo')) return;
  const c = document.getElementById('atmo');
  const a = c.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const RIB_SPACING = 9;
  const RIB_H = 150;

  /* smooth deterministic variation along x — some ribs catch more light */
  function lumAt(x, w) {
    const u = x / w;
    return 0.10
      + 0.10 * (0.5 + 0.5 * Math.sin(u * 19.7 + 1.3))
      + 0.14 * (0.5 + 0.5 * Math.sin(u * 5.3 + 4.1))
      + 0.06 * (0.5 + 0.5 * Math.sin(u * 47.0 + 0.7));
  }

  function draw() {
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    a.setTransform(dpr, 0, 0, dpr, 0, 0);
    a.clearRect(0, 0, w, h);

    for (let x = 0; x <= w; x += RIB_SPACING) {
      const lum = Math.min(lumAt(x, w), 0.42);
      const g = a.createLinearGradient(0, 0, 0, RIB_H);
      g.addColorStop(0, `rgba(242,233,228,${lum.toFixed(3)})`);
      g.addColorStop(0.8, `rgba(242,233,228,${(lum * 0.2).toFixed(3)})`);
      g.addColorStop(1, 'rgba(242,233,228,0)');
      a.strokeStyle = g;
      a.lineWidth = 0.8;
      a.beginPath(); a.moveTo(x + 0.5, 0); a.lineTo(x + 0.5, RIB_H); a.stroke();
    }
    /* hairline base of the band */
    a.strokeStyle = 'rgba(242,233,228,0.10)';
    a.lineWidth = 1;
    a.beginPath(); a.moveTo(0, RIB_H + 0.5); a.lineTo(w, RIB_H + 0.5); a.stroke();
  }
  draw();
  window.addEventListener('resize', draw);

  (function grain() {
    const g = document.createElement('canvas');
    g.width = g.height = 240;
    const gc = g.getContext('2d');
    const img = gc.createImageData(240, 240);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 110 + Math.random() * 70 | 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v;
      img.data[i+3] = 58;
    }
    gc.putImageData(img, 0, 0);
    document.getElementById('grain').style.backgroundImage = `url(${g.toDataURL()})`;
  })();
})();
