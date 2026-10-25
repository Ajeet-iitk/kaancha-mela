import path from 'node:path';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const outDir = 'C:/Users/ajeet/AppData/Local/Temp/opencode/mela-final';
fs.mkdirSync(outDir, { recursive: true });
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  defaultViewport: { width: 960, height: 560, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const logs = [];
const missing = [];
page.on('console', m => { if (m.type() !== 'debug') logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => logs.push(`PAGEERROR: ${e.stack || e.message}`));
page.on('response', r => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = name => page.screenshot({ path: path.join(outDir, name + '.png') });
const mode = () => page.evaluate(() => window.KaanchKaMela.state.mode);
const waitMode = (modes, timeout = 45000) => page.waitForFunction(
  ms => ms.includes(window.KaanchKaMela.state.mode), { timeout, polling: 100 }, modes
);
const snap = () => page.evaluate(() => ({
  mode: KaanchKaMela.state.mode,
  toppled: KaanchKaMela.state.toppled,
  throws: KaanchKaMela.state.throwsUsed,
  required: KaanchKaMela.state.required,
  damage: KaanchKaMela.state.damage,
  distance: KaanchKaMela.state.distance,
}));

async function throwAndWait(x, y, p, label) {
  const t = Date.now();
  await page.evaluate((x, y, p) => window.KaanchKaMela.throwAt(x, y, p), x, y, p);
  await waitMode(['aim', 'win', 'lose', 'resolving'], 45000).catch(() => {});
  await waitMode(['aim', 'win', 'lose', 'offer'], 45000).catch(() => {});
  if (await page.evaluate(() => window.KaanchKaMela.state.mode === 'offer')) {
    await sleep(700);
    await page.click('#offerRefuse');
    await waitMode(['aim', 'win', 'lose'], 45000).catch(() => {});
  }
  await sleep(250);
  const s = await snap();
  s.seconds = ((Date.now() - t) / 1000).toFixed(2);
  console.log(label, s);
  return s;
}

async function pickTarget(id) {
  await page.click(`.target-card[data-target="${id}"]`);
  await sleep(1500);
  await page.evaluate(() => {
    // keep the buffalo out of scripted runs
    KaanchKaMela.state.nextBuffalo = performance.now() + 999999;
  });
  console.log('started', id, await snap());
}

async function changeTarget(id) {
  await page.click('#changeBtn');
  await sleep(700);
  await pickTarget(id);
}

try {
  await page.goto('http://127.0.0.1:8123/kaancha-mela.html?v=' + Date.now(), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.KaanchKaMela, { timeout: 30000 });
  await sleep(3500);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.screenshot({ path: path.join(outDir, '40-intro.png') });

  await page.click('#enterBtn');
  await sleep(900);
  await shot('41-select');
  console.log('after enter', await page.evaluate(() => ({
    introHidden: document.getElementById('intro').classList.contains('hidden'),
    selectHidden: document.getElementById('select').classList.contains('hidden'),
    cards: document.querySelectorAll('.target-card').length,
  })));

  // ── glasses: must clear all three towers ──────────────────────
  await pickTarget('glasses');
  await shot('42-play');
  let r = await throwAndWait(0, 1.26, 1, 'glasses 1');
  if (r.mode === 'aim') r = await throwAndWait(-0.85, 1.26, 1, 'glasses 2');
  if (r.mode === 'aim') r = await throwAndWait(0.85, 1.26, 1, 'glasses 3');
  await sleep(2600);
  await shot('43-glasses-result');
  console.log('glasses resultShown', await page.evaluate(() => ({
    resultShown: KaanchKaMela.state.resultShown,
    title: document.getElementById('resultTitle').textContent,
    visible: !document.getElementById('result').classList.contains('hidden'),
  })));

  // ── cups: all six kulhads ─────────────────────────────────────
  await changeTarget('cups');
  r = await throwAndWait(0, 1.26, 1, 'cups 1');
  if (r.mode === 'aim') r = await throwAndWait(-0.85, 1.26, 1, 'cups 2');
  if (r.mode === 'aim') r = await throwAndWait(0.85, 1.26, 1, 'cups 3');
  await sleep(2400);
  await shot('44-cups-result');

  // ── crockery: plates then bowls ───────────────────────────────
  await changeTarget('crockery');
  r = await throwAndWait(-1.18, 1.26, 1, 'crockery 1');
  if (r.mode === 'aim') r = await throwAndWait(0, 1.26, 1, 'crockery 2');
  if (r.mode === 'aim') r = await throwAndWait(0.9, 1.26, 1, 'crockery 3');
  if (r.mode === 'aim') {
    const t = await page.evaluate(() => {
      const st = KaanchKaMela.state.target.items
        .filter(i => !i.fallen && !i.name.startsWith('Plate stand'))
        .sort((a, b) => b.body.position.y - a.body.position.y);
      const p = st[0];
      return p ? { x: p.body.position.x, y: p.body.position.y } : null;
    });
    console.log('crockery re-aim', t);
    if (t) r = await throwAndWait(t.x, t.y, 1, 'crockery 3');
  }
  await sleep(2400);
  await shot('45-crockery-result');

  // ── buckets: one column per ball ──────────────────────────────
  await changeTarget('buckets');
  r = await throwAndWait(-1.05, 1.45, 1, 'buckets 1');
  for (let i = 0; i < 2 && r.mode === 'aim'; i++) {
    const t = await page.evaluate(() => {
      const st = KaanchKaMela.state.target.items.filter(it => !it.fallen);
      st.sort((a, b) => Math.abs(b.body.position.x) - Math.abs(a.body.position.x));
      const p = st[0];
      return p ? { x: p.body.position.x, y: p.body.position.y } : null;
    });
    console.log('bucket re-aim', t);
    if (!t) break;
    r = await throwAndWait(t.x, t.y, 1, 'buckets ' + (i + 2));
  }
  await sleep(2400);
  await shot('46-buckets-result');

  // ── lose flow: three deliberate misses on cups ────────────────
  await changeTarget('cups');
  for (let i = 0; i < 3; i++) {
    if ((await mode()) !== 'aim') break;
    await throwAndWait(1.7, 0.45, 0.55, 'lose throw ' + (i + 1));
  }
  await waitMode(['lose'], 20000).catch(() => {});
  await sleep(300);
  await page.evaluate(() => document.getElementById('laughs').classList.add('show'));
  await page.addStyleTag({ content: '#laughs span{opacity:1!important;transform:none!important}' });
  await sleep(300);
  await shot('47-lose-laughs');
  await sleep(1100);
  await shot('48-lose-result');
  console.log('lose', await page.evaluate(() => ({
    mode: KaanchKaMela.state.mode,
    shown: KaanchKaMela.state.resultShown,
    title: document.getElementById('resultTitle').textContent,
    story: document.getElementById('resultStory').textContent,
  })));

  console.log('MISSING\n' + (missing.join('\n') || '(none)'));
  console.log('LOGS\n' + (logs.join('\n') || '(none)'));
} catch (e) {
  console.error('TEST ERROR', e);
  console.log('MISSING\n' + missing.join('\n'));
  console.log('LOGS\n' + logs.join('\n'));
} finally {
  await browser.close();
}
