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
  return { mode: s.mode, toppled: s.toppled, required: s.required, total: s.def.total, throws: s.throwsUsed };
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
  await waitMode(['aim', 'win', 'lose'], 45000).catch(() => {});
  await sleep(350);
  return snap();
}
const plans = {
  cups: [[0, 1.33], [-0.8, 1.2], [0.8, 1.2]],
  glasses: [[0, 1.36], [-0.8, 1.26], [0.8, 1.26]],
  crockery: [[-0.62, 1.31], [0.62, 1.2]],
  buckets: [[-0.6, 1.72], [0.6, 1.72]],
};
let fails = 0;
for (const [id, plan] of Object.entries(plans)) {
  await start(id);
  const s0 = await snap();
  if (s0.required !== s0.total) { console.log(id, 'FAIL required != total', s0); fails++; }
  let s = await shot(...plan[0]);
  if (s.mode === 'win') { console.log(id, 'FAIL first-throw win', s); fails++; }
  for (let i = 1; i < 3 && s.mode === 'aim' && plan[i]; i++) s = await shot(...plan[i]);
  console.log(id, s, s.mode === 'win' ? 'ok' : 'FAIL not won');
  if (s.mode !== 'win') fails++;
}
// charge response on the production bundle
await start('cups');
console.log('weak tap', await shot(0, 1.33, 0.3));
await start('cups');
console.log('half hold', await shot(0, 1.33, 0.6));
await start('cups');
console.log('full hold', await shot(0, 1.33, 1));
console.log('ERRORS', errors.length ? errors : 'none');
console.log('FAILS', fails);
await browser.close();
