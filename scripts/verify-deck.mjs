// Deck verification: scene walk, hash deep-links, keyboard nav, themes,
// mobile fallback, reduced motion. Run: node scripts/verify-deck.mjs
// (expects a local server on :8741 serving the repo root)
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:8741/index.html';
const shots = [];
let failures = 0;

function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });

/* --- desktop deck --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 960 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4200)); // let intro play

  check('deck boots', await page.evaluate(() => document.documentElement.classList.contains('deck-on')));
  check('scene 1 active', await page.evaluate(() => document.querySelector('.scene.active')?.id) === 'home');
  check('counter', (await page.evaluate(() => document.getElementById('pageno')?.textContent)).trim() === '01 / 06');

  // walk all scenes by keyboard
  const ids = ['abstract', 'work', 'activity', 'writing', 'contact'];
  for (const id of ids) {
    await page.keyboard.press('ArrowDown');
    await new Promise(r => setTimeout(r, 1200));
    const active = await page.evaluate(() => document.querySelector('.scene.active')?.id);
    check(`keyboard → ${id}`, active === id, `got ${active}`);
    await page.screenshot({ path: `scripts/out/scene-${id}.png` });
  }
  check('hash tracked', await page.evaluate(() => location.hash) === '#contact');
  check('formation orbit', await page.evaluate(() => window.FigureEngine.formation) === 'orbit');

  // walk back up to home
  for (let i = 0; i < 5; i++) { await page.keyboard.press('ArrowUp'); await new Promise(r => setTimeout(r, 1150)); }
  check('back to home', await page.evaluate(() => document.querySelector('.scene.active')?.id) === 'home');

  // dark theme spot-check
  await page.click('#theme-toggle-btn');
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: 'scripts/out/scene-home-dark.png' });
  await page.close();
}

/* --- hash deep link --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 960 });
  await page.goto(URL + '#work', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  check('deep link #work', await page.evaluate(() => document.querySelector('.scene.active')?.id) === 'work');
  await page.close();
}

/* --- mobile fallback --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  check('mobile: no deck', await page.evaluate(() => !document.documentElement.classList.contains('deck-on')));
  check('mobile: page scrolls', await page.evaluate(() => document.body.scrollHeight > window.innerHeight));
  await page.screenshot({ path: 'scripts/out/mobile.png' });
  await page.close();
}

/* --- reduced motion --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 960 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));
  await page.keyboard.press('ArrowDown');
  await new Promise(r => setTimeout(r, 500));
  check('reduced motion: instant advance', await page.evaluate(() => document.querySelector('.scene.active')?.id) === 'abstract');
  await page.close();
}

/* --- wheel advance --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 960 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4200)); // let intro play
  await page.mouse.wheel({ deltaY: 150 });
  await new Promise(r => setTimeout(r, 1300));
  const active = await page.evaluate(() => document.querySelector('.scene.active')?.id);
  check('wheel advance → abstract', active === 'abstract', `got ${active}`);
  await page.close();
}

/* --- plates hover preview --- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 960 });
  await page.goto(URL + '#work', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  await page.hover('#plate-list a[href="projects/noeron.html"]');
  await new Promise(r => setTimeout(r, 200));
  const src = await page.evaluate(() => document.getElementById('plate-preview-img')?.src || '');
  const cap = await page.evaluate(() => document.getElementById('plate-preview-cap')?.textContent || '');
  check('plates hover: noeron preview', src.includes('noeron') && cap.includes('Plate II'), `src=${src} cap=${cap}`);
  await page.close();
}

await browser.close();
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
