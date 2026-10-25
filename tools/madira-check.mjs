import path from 'node:path';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const outDir = 'C:/Users/ajeet/AppData/Local/Temp/opencode/mela-madira';
fs.mkdirSync(outDir, { recursive: true });
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = name => page.screenshot({ path: path.join(outDir, name + '.png') });
await page.goto('http://127.0.0.1:8123/kaancha-mela.html?v=' + Date.now(), { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.KaanchKaMela, { timeout: 30000 });
await sleep(3200);
await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });

const waitMode = (modes, timeout = 60000) => page.waitForFunction(
  ms => ms.includes(window.KaanchKaMela.state.mode), { timeout, polling: 100 }, modes
);
const snap = () => page.evaluate(() => {
  const s = KaanchKaMela.state;
  return {
    mode: s.mode, throws: s.throwsUsed, toppled: s.toppled, required: s.required,
    drunk: s.drunk, offerShown: s.offerShown,
    offerVisible: !document.getElementById('offer').classList.contains('hidden'),
    bodyDrunk: document.body.classList.contains('drunk'),
    pillHidden: document.getElementById('drunkPill').classList.contains('hidden'),
    wobble: KaanchKaMela.wobble(),
    fxOpacity: getComputedStyle(document.getElementById('drunkFx')).opacity,
  };
});
async function start() {
  await page.evaluate(() => {
    KaanchKaMela.startRun('cups');
    KaanchKaMela.state.nextBuffalo = performance.now() + 999999;
  });
  await sleep(1900);
}
async function throwAt(x, y) {
  await page.evaluate((x, y) => KaanchKaMela.throwAt(x, y, 1), x, y);
  await waitMode(['aim', 'win', 'lose', 'offer'], 60000).catch(() => {});
  await sleep(450);
}
// aims at the intended point while cancelling whatever the madira is doing to the ring
async function drunkThrow(x, y) {
  await page.evaluate((x, y) => {
    const w = KaanchKaMela.wobble();
    KaanchKaMela.throwAt(x - w.x, y - w.y, 1);
  }, x, y);
  await waitMode(['aim', 'win', 'lose', 'offer'], 60000).catch(() => {});
  await sleep(450);
}

console.log('— offer appears after ball 1 —');
await start();
console.log('before throw', await snap());
await throwAt(0, 1.26);
await waitMode(['offer', 'win', 'lose'], 60000).catch(() => {});
await sleep(500);
console.log('after throw 1', await snap());
const texts = await page.evaluate(() => ({
  title: document.getElementById('offerTitle').textContent,
  quote: document.querySelector('.offer-quote').textContent,
  accept: document.getElementById('offerAccept').textContent.trim(),
  refuse: document.getElementById('offerRefuse').textContent.trim(),
}));
console.log('offer copy', texts);
await shot('50-offer-en');

console.log('\n— refusing changes nothing —');
await page.screenshot({ path: path.join(outDir, 'before-refuse.png') });
await sleep(700);
await page.click('#offerRefuse');
await sleep(700);
console.log('after refuse', await snap());

console.log('\n— refusing still allows the normal win —');
await throwAt(-0.85, 1.26);
console.log('ball 2 refused', await snap());
if ((await page.evaluate(() => KaanchKaMela.state.mode)) === 'aim') await throwAt(0.85, 1.26);
console.log('refused run end', await snap());

console.log('\n— accepting makes the world swim —');
await start();
await throwAt(0, 1.26);
await waitMode(['offer', 'win', 'lose'], 60000).catch(() => {});
await sleep(900);
console.log('offer again', await snap());
await page.click('#offerAccept');
await sleep(1200);
const accepted = await snap();
console.log('accepted', accepted);
await shot('51-drunk-game');
const w1 = await page.evaluate(() => KaanchKaMela.wobble());
await sleep(700);
const w2 = await page.evaluate(() => KaanchKaMela.wobble());
console.log('wobble drift', w1, '->', w2, 'deltaX', (w2.x - w1.x).toFixed(3));
const drunkState = await page.evaluate(() => ({
  fx: getComputedStyle(document.getElementById('drunkFx')).opacity,
  pill: document.getElementById('drunkPill').textContent.trim(),
}));
console.log('drunk ui', drunkState);

console.log('\n— a sober-eyed player can still fight the wobble —');
await drunkThrow(-0.85, 1.26);
console.log('drunk ball 2', await snap());
if ((await page.evaluate(() => KaanchKaMela.state.mode)) === 'aim') await drunkThrow(0.85, 1.26);
console.log('drunk run end', await snap());
await page.screenshot({ path: path.join(outDir, '52-drunk-end.png') });

console.log('\n— offer only happens once —');
await start();
await throwAt(0, 1.26);
await waitMode(['offer', 'win', 'lose'], 60000).catch(() => {});
await sleep(900);
await page.click('#offerRefuse');
await sleep(600);
await throwAt(-0.85, 1.26);
await waitMode(['aim', 'offer', 'win', 'lose'], 60000).catch(() => {});
await sleep(600);
console.log('after ball 2', await snap());

console.log('\nERRORS', errors.length ? errors : 'none');
await browser.close();
