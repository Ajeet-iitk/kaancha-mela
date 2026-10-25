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
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function open(w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('http://127.0.0.1:8123/kaancha-mela.html?v=' + Date.now(), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.KaanchKaMela, { timeout: 30000 });
  await sleep(3000);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  return page;
}

const page = await open(1280, 720);
await page.screenshot({ path: path.join(outDir, '60-select-desktop.png') });
for (const id of ['cups', 'glasses', 'crockery', 'buckets']) {
  await page.evaluate(id => {
    KaanchKaMela.startRun(id);
    KaanchKaMela.state.nextBuffalo = performance.now() + 999999;
  }, id);
  await sleep(2200);
  await page.screenshot({ path: path.join(outDir, `61-${id}.png`) });
  const info = await page.evaluate(() => ({
    total: KaanchKaMela.state.def.total,
    required: KaanchKaMela.state.def.required,
    items: KaanchKaMela.state.target.items.map(i => i.name),
  }));
  console.log(id, info);
}
await page.close();

const mob = await open(390, 844);
await mob.screenshot({ path: path.join(outDir, '62-select-mobile.png') });
await mob.evaluate(() => {
  KaanchKaMela.startRun('crockery');
  KaanchKaMela.state.nextBuffalo = performance.now() + 999999;
});
await sleep(2200);
await mob.screenshot({ path: path.join(outDir, '63-crockery-mobile.png') });
await mob.close();
await browser.close();
console.log('shots in', outDir);
