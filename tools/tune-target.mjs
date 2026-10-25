import puppeteer from 'puppeteer-core';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 900, height: 560 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto('http://127.0.0.1:8123/kaancha-mela.html?v=' + Date.now(), { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.KaanchKaMela, { timeout: 30000 });
await sleep(2500);
const waitMode = (modes, timeout = 45000) => page.waitForFunction(
  ms => ms.includes(window.KaanchKaMela.state.mode), { timeout, polling: 100 }, modes
);
const snap = () => page.evaluate(() => {
  const s = KaanchKaMela.state;
  return {
    mode: s.mode, toppled: s.toppled, total: s.def.total, throws: s.throwsUsed,
    left: s.target.items.filter(i => !i.fallen).map(i => i.name),
  };
});
async function start(id) {
  await page.evaluate(id => {
    KaanchKaMela.startRun(id);
    KaanchKaMela.state.nextBuffalo = performance.now() + 999999;
  }, id);
  await sleep(1600);
}
async function shot(x, y, p = 1) {
  await page.evaluate((x, y, p) => KaanchKaMela.throwAt(x, y, p), x, y, p);
  await waitMode(['aim', 'win', 'lose', 'offer'], 45000).catch(() => {});
  if (await page.evaluate(() => KaanchKaMela.state.mode === 'offer')) {
    for (let tries = 0; tries < 3 && await page.evaluate(() => KaanchKaMela.state.mode === 'offer'); tries++) {
      await sleep(800);
      await page.evaluate(() => document.getElementById('offerRefuse').click());
      await sleep(500);
    }
    await waitMode(['aim', 'win', 'lose'], 45000).catch(() => {});
  }
  await sleep(350);
  return snap();
}

const plans = JSON.parse(process.argv[2] || '[[-0.9,1.2],[0,1.2],[0.9,1.18]]');
const target = process.argv[3] || 'crockery';
await start(target);
console.log('start', await snap());
let s = await snap();
for (const [x, y] of plans) {
  if (s.mode !== 'aim') break;
  s = await shot(x, y);
  console.log(`shot ${x},${y}`, s);
}
console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
