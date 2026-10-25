import path from 'node:path';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const outDir = 'C:/Users/ajeet/AppData/Local/Temp/opencode/mela-layouts';
fs.mkdirSync(outDir, { recursive: true });
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto('http://127.0.0.1:8123/kaancha-mela.html?v=' + Date.now(), { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.KaanchKaMela, { timeout: 30000 });
await sleep(3000);
await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
await page.evaluate(() => {
  KaanchKaMela.startRun('buckets');
  KaanchKaMela.state.nextBuffalo = performance.now() + 999999;
});
await sleep(2200);
const waitMode = (modes, timeout = 45000) => page.waitForFunction(
  ms => ms.includes(window.KaanchKaMela.state.mode), { timeout, polling: 100 }, modes
);
async function shot(x, y, label) {
  await page.evaluate((x, y) => KaanchKaMela.throwAt(x, y, 1), x, y);
  await waitMode(['aim', 'win', 'lose', 'offer'], 45000).catch(() => {});
  if (await page.evaluate(() => KaanchKaMela.state.mode === 'offer')) {
    await sleep(800);
    await page.evaluate(() => document.getElementById('offerRefuse').click());
    await waitMode(['aim', 'win', 'lose'], 45000).catch(() => {});
  }
  await sleep(600);
  const info = await page.evaluate(() => ({
    mode: KaanchKaMela.state.mode,
    toppled: KaanchKaMela.state.toppled,
    balls: KaanchKaMela.state.balls.map(b => ({ x: +b.body.position.x.toFixed(2), y: +b.body.position.y.toFixed(2), z: +b.body.position.z.toFixed(2) })),
    left: KaanchKaMela.state.target.items.filter(i => !i.fallen).map(i => ({
      n: i.name, x: +i.body.position.x.toFixed(2), y: +i.body.position.y.toFixed(2), z: +i.body.position.z.toFixed(2),
    })),
  }));
  console.log(label, JSON.stringify(info, null, 1));
  await page.screenshot({ path: path.join(outDir, label + '.png') });
}
await shot(-1.05, 1.32, '70-bucket-1');
await shot(0, 1.32, '71-bucket-2');
await shot(1.05, 1.32, '72-bucket-3');
await browser.close();
